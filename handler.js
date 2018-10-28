"use strict";

const mongoose = require('mongoose');
const bluebird = require('bluebird');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fileType = require('file-type');
const validator = require('validator');
const Project = require('./models/project.js');
const User = require('./models/user.js');
const Organization = require('./models/organization.js');



mongoose.Promise = bluebird;

const mongoString = process.env.MONGO_URI; // MongoDB Url
const mongooseOptions = {
    server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }
};

const createSuccessResponse = (statusCode, body) => ({
    statusCode: statusCode || 200,
    headers: {
        'Access-Control-Allow-Origin' : '*',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
});

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 500,
    headers: {
        'Access-Control-Allow-Origin' : '*',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({'message': message}),
});

/*************************
 * PROJECTS
 *************************/

/**
 * GET PROJECT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.getProject = (event, context, callback) => {
    const project_id = event.pathParameters.project_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    mongoose.connect(mongoString, mongooseOptions);
    const db = mongoose.connection;

    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'))
    });
    db.on('open', () => {
        Project
            .findById(project_id)
            // TODO: Might be a good idea to limit population based on scopes
            .populate({path: 'entries.student', select: 'name'})
            .populate({path: 'organization', select: 'name about'})
            .populate({path: 'liaison', select: 'name'})
            .populate({path: 'selectedEntry', select: 'name'})
            .populate({path: 'comments.author', select: 'name'})
            .then((project) => {
                if (!project) {
                    callback(null, createErrorResponse(404, 'Project not found'));
                    db.close();
                } else {
                    callback(null, createSuccessResponse(200, project));
                    db.close();
                }
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
                db.close();
            });
    });
};


/**
 * LIST PROJECTS
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.listProjects = (event, context, callback) => {
    let statusQuery = event.queryStringParameters ? { status: event.queryStringParameters.status || 'active' } : {};

    mongoose.connect(mongoString, mongooseOptions);
    const db = mongoose.connection;

    db.on('error', () => {callback(null, createErrorResponse(503, 'There was an error connecting to the database'))});
    db.once('open', () => {
        Project
            .find(statusQuery)
            .populate({path: 'organization', select: 'name'})
            .then((projects) => {
                callback(null, createSuccessResponse(200, projects));
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                // Close db connection or node event loop won't exit , and lambda will timeout
                db.close();
            });
    });
};


/**
 * CREATE PROJECT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createProject = (event, context, callback) => {
    // console.log(event)
    // callback(null, {statusCode: 201, body: JSON.stringify(event)});

    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to post a project'));
    }

    mongoose.connect(mongoString, mongooseOptions);
    const db = mongoose.connection;
    let data = {};
    let errs = {};
    let project = {};

    data = JSON.parse(event.body);

    project = new Project({
        title: data.title,
        summary: data.summary,
        liaison: authenticatedUserId,
        organization: data.organization,
        fullDescription: data.fullDescription,
        deliverables: data.deliverables,
        category: data.category,
        status: 'active'
    });

    if (data.deadline) {
        project.deadline = Date.parse(data.deadline)
    }



    errs = project.validateSync();

    if (errs) {
        console.log(errs);
        callback(null, createErrorResponse(400, 'Incorrect project data'));
        db.close();
        return;
    }

    db.on('error', () => {callback(null, createErrorResponse(503, 'There was an error connecting to the database'))});
    db.once('open', () => {
        project
            .save()
            .then((project) => {
                User.findByIdAndUpdate(authenticatedUserId, {$push: {'projects': project._id}}, {'upsert': true}).exec()  // TODO: Take upsert out of this. Doesn't seem safe
            })
            .then(() => {
                s3.putObject(
                    {
                        Bucket: 'scholance-projects',
                        Key: project._id.toString() + '/'
                    }, function(err, data) {
                        if (err) {
                        console.log(err);
                        callback(null, createErrorResponse(503, 'There was an error creating the S3 bucket'));
                    }
                    else{
                        console.log(data);
                        callback(null, createSuccessResponse(201, project));
                    }
                    /*
                    data = {
                     Location: "http://examplebucket.s3.amazonaws.com/"
                    }
                    */
                    });
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            });
    });
};


/**
 * UPDATE PROJECT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updateProject = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to update a project'));
    }


    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    let project_id = event.pathParameters.project_id;
    let data = {};
    data = JSON.parse(event.body);

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        db.close();
        return;
    }

    db.on('error', () => {
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
        db.close();
    });
    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    callback(null, createErrorResponse(404, 'Project not found'));
                    db.close();
                } else if (authenticatedUserId != project.liaison) {
                    callback(null, createErrorResponse(403, 'You can only update your own project'));
                    db.close();
                } else {
                    project.update({
                        title: data.title,
                        summary: data.summary,
                        liaison: authenticatedUserId,
                        organization: data.organization,
                        fullDescription: data.fullDescription,
                        specs: data.specs,
                        deliverables: data.deliverables,
                        category: data.category
                    })
                        .then(() => {
                            callback(null, createSuccessResponse(200, project));
                            db.close();
                        })
                        .catch((err) => {
                            callback(null, createErrorResponse(err.statusCode, err.message));
                            db.close();
                        })
                }
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
                db.close();
            })

    });
};


/**
 * DELETE PROJECT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteProject = (event, context, callback) => {

    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to delete a project'));
    }

    mongoose.connect(mongoString, mongooseOptions);
    const db = mongoose.connection;
    const project_id = event.pathParameters.project_id;
    let data = {};
    data = JSON.parse(event.body);

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        db.close();
        return;
    }

    db.on('error', () => {
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'))
        db.close();
    });
    db.on('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    callback(null, createErrorResponse(404, 'Project not found'));
                    db.close();
                } else if (authenticatedUserId != project.liaison) {
                    callback(null, createErrorResponse(403, 'You can only delete your own project'));
                    db.close();
                } else {
                    project
                        .remove({_id: project_id})
                        .then(() => {
                            callback(null, createSuccessResponse(204));
                            db.close();
                        })
                        .catch((err) => {
                            callback(null, createErrorResponse(err.statusCode, err.message));
                            db.close();
                        })
                }
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
                db.close();
            })
    });
};


/**
 * UPDATE PROJECT STATUS
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updateProjectStatus = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to update a project'));
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    let project_id = event.pathParameters.project_id;
    let data = {};
    data = JSON.parse(event.body);

    let status = data.status;
    let selectedEntryId = data.selectedEntryId;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        db.close();
        return;
    }

    db.on('error', () => {
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
        db.close();
    });
    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    callback(null, createErrorResponse(404, 'Project not found'));
                    db.close();
                } else if (authenticatedUserId != project.liaison) {
                    callback(null, createErrorResponse(403, 'You can only update your own project'));
                    db.close();
                } else {
                    project.entries.id(selectedEntryId).selected = true;
                    console.log(project);
                    project.save();
                    project.update(
                        {
                            status: status
                        }
                    )
                        .then(() => {
                            if (status === 'complete') {
                                let itemsProcessed = 0;
                                project.entries.forEach((entry, index, array) => {
                                    User.findByIdAndUpdate(entry.student, {
                                        $push: {
                                            portfolioEntries: {
                                                project: {
                                                    title: project.title,
                                                    organization: project.organization,
                                                    liaison: project.liaison,
                                                    summary: project.summary
                                                },
                                                submission: {
                                                    assets: entry.assets,
                                                    selected: entry.selected
                                                },
                                                visible: true
                                            }
                                        }
                                    })
                                    .then((user) => {
                                        itemsProcessed++;
                                        if (itemsProcessed === array.length) {
                                            db.close();
                                            callback(null, createSuccessResponse(200, project));
                                        }
                                    })
                                    .catch((err) => {
                                            callback(null, createErrorResponse(err.statusCode, err.message));
                                            db.close();
                                        })
                                    });
                                };
                        })
                        .catch((err) => {
                            callback(null, createErrorResponse(err.statusCode, err.message));
                            db.close();
                        })
                }
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
                db.close();
            })

    });
};


/**
 * CREATE PROJECT COMMENT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createProjectComment = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    }

    let project_id = event.pathParameters.project_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let newComment = {
        author: authenticatedUserId,
        text: data.text
    };

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else {
                    project.comments.push(newComment);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, createSuccessResponse(201, newProject));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * DELETE PROJECT COMMENT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteProjectComment = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    }

    let project_id = event.pathParameters.project_id;
    let comment_id = event.pathParameters.comment_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(comment_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else {
                    let commentIndex = project.comments.findIndex( comment => comment._id == comment_id);
                    project.comments.splice(commentIndex, 1);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, createSuccessResponse(204));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};



/*************************
 * SUPPLEMENTAL RESOURCE
 *************************/

/**
 * UPLOAD SUPPLEMENTAL RESOURCE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createSupplementalResource = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to add resources to a project'));
    }

    let project_id = event.pathParameters.project_id;
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let newAsset = {
        name: data.name,
        mediaType: data.mediaType
    };

    if (data.uri) {
        newAsset.uri = data.uri;
    }

    if (data.text) {
        newAsset.text = data.text;
    }

    // TODO: If it is a link, add "http" if needed

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if(authenticatedUserId != project.liaison) {
                    callback(null, createErrorResponse(403, 'You cannot add a resource to a project that is not your own'));
                    db.close();
                } else {
                    project.update({
                        $push: {'supplementalResources': newAsset}
                    })
                        .then(() => {
                            db.close();
                            callback(null, createSuccessResponse(201, newAsset));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        })
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * UPLOAD SUPPLEMENTAL RESOURCE FILE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createSupplementalResourceFile = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to add resources to a project'));
    }

    let project_id = event.pathParameters.project_id;
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);
    //get the request
    let name = data.name;
    let file = data.file;
    let text = data.text;
    let base64String = file.replace('data:image/png;base64,', ''); // TODO: Clean this up
    if (!name || !base64String) {
        callback(null, createErrorResponse(400, 'Invalid input'));
    }
    //pass the base64 string into a buffer
    let buffer = new Buffer(base64String, 'base64');
    let fileMime = fileType(buffer);
    // Check if the base64 encoded string is a file
    if (fileMime === null) {
        callback(null, createErrorResponse(400, 'The string supplied is not a file type'));
    }

    let fileExt = fileMime.ext;
    let mediaType = fileMime.mime.split('/')[0];

    let bucketName = 'dev-scholance-projects';
    let filePath = project_id + '/supplemental-resources/';
    let fileName = name + '.' + fileExt;
    let fileFullName = filePath + fileName;

    let params = {
        Bucket: bucketName,
        Key: fileFullName,
        Body: buffer
    };

    let fileLink = 'https://s3.amazonaws.com/' + bucketName + '/' + fileFullName.replace(' ', '+');

    s3.putObject(params, function(err, data) {
        if (err) {
            callback(null, createErrorResponse(500, 'Could not upload to S3'));
        }

        ////
        mongoose.connect(mongoString, mongooseOptions);
        let db = mongoose.connection;

        db.on('error', () => {
            db.close();
            callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
        });
        db.once('open', () => {
            Project
                .findById(project_id)
                .then((project) => {
                    if (!project) {
                        db.close();
                        callback(null, createErrorResponse(404, 'Project not found'));
                    } else if(authenticatedUserId != project.liaison) {
                        callback(null, createErrorResponse(403, 'You cannot add a resource to a project that is not your own'));
                        db.close();
                    } else {
                        const asset = {name: name, mediaType: mediaType, uri: fileLink, text: text};
                        project.update({
                            $push: {'supplementalResources': asset}
                        })
                            .then(() => {
                                db.close();
                                callback(null, createSuccessResponse(201, asset));
                            })
                            .catch((err) => {
                                db.close();
                                callback(null, createErrorResponse(err.statusCode, err.message));
                            })
                    }
                })
                .catch((err) => {
                    db.close();
                    callback(null, createErrorResponse(err.statusCode, err.message));
                })
        });
        ////
    })
};


/**
 * DELETE SUPPLEMENTAL RESOURCE ASSET
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteSupplementalResource = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, createErrorResponse(403, 'You must be a business user to manage a supplemental resource'));
    }

    let project_id = event.pathParameters.project_id;
    let asset_id = event.pathParameters.asset_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)
        || !mongoose.Types.ObjectId.isValid(authenticatedUserId)
        || !mongoose.Types.ObjectId.isValid(asset_id)
    ) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if (project.liaison != authenticatedUserId) {
                    db.close();
                    callback(null, createErrorResponse(403, 'Liaison does not have access to this project'));
                } else {
                    let assetIndex = project.supplementalResources.findIndex( asset => asset._id == asset_id);
                    let asset = project.supplementalResources.splice(assetIndex, 1);
                    console.log(assetIndex);
                    console.log(asset);
                    project.save()
                        .then(() => {
                            if (asset.mediaType === 'image') {
                                let bucketName = 'dev-scholance-projects';

                                let params = {
                                    Bucket: bucketName,
                                    Key: asset.uri
                                };

                                console.log('738');

                                s3.deleteObject(params, function(err, data) {
                                    if (err) {
                                        callback(null, createErrorResponse(500, 'Could not delete file from S3'));
                                    }
                                    callback(null, createSuccessResponse(204));
                                });
                            } else {
                                callback(null, createSuccessResponse(204));
                            }
                            db.close();
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/*************************
 * ENTRY
 *************************/


/**
 * GET ENTRY
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.getEntryByStudentId = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    let project_id = event.pathParameters.project_id;
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let user_id = event.pathParameters.user_id;
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    db.once('open', () => {
        Project
            .findById(project_id)
            .populate({path: 'entries.student', select: 'name'})
            .populate({path: 'entries.comments.author', select: 'name'})
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else {
                    const entry = project.entries.find(entry => entry.student._id == user_id);
                    if (entry) {
                        callback(null, createSuccessResponse(200, entry));
                    } else {
                        callback(null, createErrorResponse(404, 'Entry not found'));
                    }
                }
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            })
    });
};


/**
 * PROJECT SIGNUP
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignup = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, createErrorResponse(403, 'You must be a student to sign up for a project'));
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    let project_id = event.pathParameters.project_id;
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if (project.entries.some(element => element.student == authenticatedUserId)) {
                    db.close();
                    callback(null, createErrorResponse(409, 'You are already signed up for this project'));
                } else {
                    project.update({
                        $push: {'entries': {student: authenticatedUserId, submissionStatus: 'active'}}
                    })
                        .then(() => {
                            User.findByIdAndUpdate(authenticatedUserId, {$push: {'projects': project_id}}, {'upsert': true}).exec()  // TODO: Take upsert out of this. Doesn't seem safe
                        })
                        .then(() => {
                            s3.putObject(
                                {
                                    Bucket: 'scholance-users',
                                    Key: authenticatedUserId + '/projects/' + project._id.toString() + '/'
                                }, function(err, data) {
                                    if (err) {
                                        console.log(err);
                                        callback(null, createErrorResponse(503, 'There was an error creating the S3 bucket'));
                                    }
                                    else{
                                        callback(null, createSuccessResponse(201, project));
                                    }
                                    /*
                                    data = {
                                     Location: "http://examplebucket.s3.amazonaws.com/"
                                    }
                                    */
                                });
                            // db.close();
                            // callback(null, {statusCode: 204});
                        })
                        .catch((err) => {
                            // db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        })
                        .finally(() => {
                            db.close();
                        })
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * PROJECT SIGNOFF
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignoff = (event, context, callback) => {
    // Authenticated user information

    // callback(null, {statusCode: 200, body: JSON.stringify(event)});

    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, createErrorResponse(403, 'Student ID does not match authenticated user'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, createErrorResponse(403, 'You must be a student to sign up for a project'));
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    let project_id = event.pathParameters.project_id;
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);
    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, createErrorResponse(404, 'You are not currently signed up for this project'));
                } else {
                    project.update({
                        $pull: {'entries': {student: authenticatedUserId}}
                    })
                        .then(() => {
                            User.findById(authenticatedUserId)
                                .then((user) => {
                                    let projectIndex = user.projects.indexOf(project_id);
                                    user.projects.splice(projectIndex, 1);
                                    user.save()
                                        .then(() => {
                                            db.close();
                                            callback(null, createSuccessResponse(204));
                                        })
                                })
                                .catch((err) => {
                                    db.close();
                                    callback(null, createErrorResponse(err.statusCode, err.message));
                                });
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        })
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * UPDATE ENTRY
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updateEntry = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, createErrorResponse(403, 'You do not have access to this project entry'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let entryUpdateRequest = {
        commentary: data.commentary,
        submissionStatus: data.submissionStatus
    };


    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, createErrorResponse(404, 'User is not signed up for this project'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == authenticatedUserId);
                    project.entries[entryIndex].submissionStatus = entryUpdateRequest.submissionStatus;
                    if (entryUpdateRequest.commentary) {
                        project.entries[entryIndex].commentary = entryUpdateRequest.commentary;
                    }
                    project.save()
                        .then((updatedProject) => {
                            db.close();
                            callback(null, createSuccessResponse(201, updatedProject.entries[entryIndex].assets.slice(-1)[0]));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * CREATE ENTRY COMMENT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createEntryComment = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let newComment = {
        author: authenticatedUserId,
        text: data.text
    };

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == user_id);
                    console.log(entryIndex);
                    project.entries[entryIndex].comments.push(newComment);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, createSuccessResponse(201, newProject.entries[entryIndex].comments.slice(-1)[0]));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * DELETE ENTRY COMMENT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteEntryComment = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;
    let comment_id = event.pathParameters.comment_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == user_id);
                    console.log(entryIndex);
                    let commentIndex = project.entries[entryIndex].comments.findIndex( comment => comment._id == comment_id);
                    project.entries[entryIndex].comments.splice(commentIndex, 1);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, createSuccessResponse(204));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/*************************
 * ENTRY ASSETS
 *************************/


/**
 * UPLOAD ENTRY ASSET
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createEntryAsset = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, createErrorResponse(403, 'You do not have access to this project entry'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let newAsset = {
        name: data.name,
        mediaType: data.mediaType
    };

    if (data.uri) {
        newAsset.uri = data.uri;
    }

    if (data.text) {
        newAsset.text = data.text;
    }


    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, createErrorResponse(404, 'User is not signed up for this project'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == authenticatedUserId);
                    project.entries[entryIndex].assets.push(newAsset);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, createSuccessResponse(201, newProject.entries[entryIndex].assets.slice(-1)[0]));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * UPLOAD ENTRY ASSET FROM A FILE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createEntryAssetFile = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, createErrorResponse(403, 'You do not have access to this project entry'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let user_id = event.pathParameters.user_id;
    let project_id = event.pathParameters.project_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);
    //get the request
    let name = data.name;
    let text = data.text;
    let file = data.file.split(';');
    console.log(file);
    let base64String = file[1].replace('base64,', ''); // TODO: Clean this up
    if (!name || !base64String) {
        callback(null, createErrorResponse(400, 'Invalid input'));
    }
    //pass the base64 string into a buffer
    let buffer = new Buffer(base64String, 'base64');
    let fileMime = fileType(buffer);
    // Check if the base64 encoded string is a file
    if (fileMime === null) {
        callback(null, createErrorResponse(400, 'The string supplied is not a file type'));
    }

    let fileExt = fileMime.ext;
    let mediaType = fileMime.mime.split('/')[0];

    let bucketName = 'dev-scholance-projects';

    let filePath = project_id + '/entries/' + user_id + '/assets/';
    let fileName = name + '.' + fileExt;
    let fileFullName = filePath + fileName;

    let params = {
        Bucket: bucketName,
        Key: fileFullName,
        Body: buffer
    };

    let fileLink = 'https://s3.amazonaws.com/' + bucketName + '/' + fileFullName.replace(' ', '+');

    s3.putObject(params, function(err, data) {
        if (err) {
            callback(null, createErrorResponse(500, 'Could not upload to S3'));
        }

        mongoose.connect(mongoString, mongooseOptions);
        let db = mongoose.connection;
        db.on('error', () => {
            db.close();
            callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
        });

        db.once('open', () => {
            Project
                .findById(project_id)
                .then((project) => {
                    if (!project) {
                        db.close();
                        callback(null, createErrorResponse(404, 'Project not found'));
                    } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                        db.close();
                        callback(null, createErrorResponse(404, 'User is not signed up for this project'));
                    } else {
                        console.log(mediaType);
                        let newAsset = {
                            name: name,
                            mediaType: mediaType,
                            uri: fileLink,
                            text: text
                        };
                        let entryIndex = project.entries.findIndex( entry => entry.student == authenticatedUserId);
                        project.entries[entryIndex].assets.push(newAsset);
                        project.save()
                            .then((newProject) => {
                                db.close();
                                callback(null, createSuccessResponse(201, newAsset));
                            })
                            .catch((err) => {
                                db.close();
                                callback(null, createErrorResponse(err.statusCode, err.message));
                            });
                    }
                })
                .catch((err) => {
                    db.close();
                    callback(null, createErrorResponse(err.statusCode, err.message));
                })
        });
    })
};


/**
 * DELETE ENTRY ASSET
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteEntryAsset = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, createErrorResponse(403, 'You do not have access to this project entry'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let project_id = event.pathParameters.project_id;
    let asset_id = event.pathParameters.asset_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)
        || !mongoose.Types.ObjectId.isValid(authenticatedUserId)
        || !mongoose.Types.ObjectId.isValid(asset_id)
    ) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, createErrorResponse(404, 'User is not signed up for this project'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == authenticatedUserId);
                    let entry = project.entries[entryIndex];
                    let assetIndex = entry.assets.findIndex( asset => asset._id == asset_id);
                    let asset = project.entries[entryIndex].assets.splice(assetIndex, 1);
                    project.save()
                        .then(() => {
                            if (asset.mediaType === 'image') {
                                let bucketName = 'dev-scholance-projects';

                                let params = {
                                    Bucket: bucketName,
                                    Key: asset.uri
                                };

                                console.log('738');

                                s3.deleteObject(params, function(err, data) {
                                    if (err) {
                                        callback(null, createErrorResponse(500, 'Could not delete file from S3'));
                                    }
                                    callback(null, createSuccessResponse(204));
                                });
                            } else {
                                callback(null, createSuccessResponse(204));
                            }
                            db.close();
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
    });
};
