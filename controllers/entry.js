"use strict";

const helper = require('./_helper');
const constants = require('../lib/constants');

const Project = require('../models/project.js');
const User = require('../models/user.js');

const dbService = require('../lib/db');

const EntryService = require('../services/entry');
const entryService = new EntryService(dbService);



/**
 * GET ENTRY
 *
 * @param {{pathParameters: {project_id: string, student_id: string}, requestContext: {authorizer: {principalId: string}}}} event
 * @param context
 * @param callback
 */
module.exports.getEntryByStudentId = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.student_id;


        entryService.getByStudentId(projectId, studentId, (err, project) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }



    // // Authenticated user information
    // const principalId = event.requestContext.authorizer.principalId;
    // const auth = principalId.split("|");
    // const authenticationProvider = auth[0];
    // let authenticatedUserId = auth[1];
    // if (authenticationProvider !== 'auth0') {
    //     callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    //     db.close();
    // }
    //
    // DBService.connect(mongoString, mongooseOptions);
    // let db = mongoose.connection;
    // db.on('error', () => {
    //     db.close();
    //     callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    // });

    // let project_id = event.pathParameters.project_id;
    // if (!mongoose.Types.ObjectId.isValid(project_id)) {
    //     db.close();
    //     callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
    //     return;
    // }
    //
    // let user_id = event.pathParameters.user_id;
    // if (!mongoose.Types.ObjectId.isValid(user_id)) {
    //     db.close();
    //     callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
    //     return;
    // }

    // db.once('open', () => {
    //     Project
    //         .findById(project_id)
    //         .populate({path: 'entries.student', select: 'name'})
    //         .populate({path: 'entries.comments.author', select: 'name'})
    //         .then((project) => {
    //             if (!project) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(404, 'Project not found'));
    //             } else {
    //                 const entry = project.entries.find(entry => entry.student._id == user_id);
    //                 if (entry) {
    //                     callback(null, helper.createSuccessResponse(200, entry));
    //                 } else {
    //                     callback(null, helper.createErrorResponse(404, 'Entry not found'));
    //                 }
    //             }
    //         })
    //         .catch((err) => {
    //             callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //         })
    //         .finally(() => {
    //             db.close();
    //         })
    // });
};


/**
 * PROJECT SIGNUP
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignup = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to sign up for a project'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.student_id;


        entryService.projectSignup(projectId, studentId, (err, project) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }





    // // Authenticated user information
    // const principalId = event.requestContext.authorizer.principalId;
    // const auth = principalId.split("|");
    // const authenticationProvider = auth[0];
    // let authenticatedUserId = auth[1];
    // if (authenticationProvider !== 'auth0') {
    //     callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    //     db.close();
    // }
    //
    // // Authorize the authenticated user's scopes
    // const scope = event.requestContext.authorizer.scope;
    // const scopes = scope.split(" ");
    // if (!scopes.includes("manage:entry")) {
    //     callback(null, helper.createErrorResponse(403, 'You must be a student to sign up for a project'));
    // }

    // DBService.connect(mongoString, mongooseOptions);
    // let db = mongoose.connection;
    // db.on('error', () => {
    //     db.close();
    //     callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    // });
    //
    // let project_id = event.pathParameters.project_id;
    // if (!mongoose.Types.ObjectId.isValid(project_id)) {
    //     db.close();
    //     callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
    //     return;
    // }

    // let data = JSON.parse(event.body);

    // db.once('open', () => {
    //     Project
    //         .findById(project_id)
    //         .then((project) => {
    //             if (!project) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(404, 'Project not found'));
    //             } else if (project.entries.some(element => element.student == authenticatedUserId)) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(409, 'You are already signed up for this project'));
    //             } else {
    //                 project.update({
    //                     $push: {'entries': {student: authenticatedUserId, submissionStatus: 'active'}}
    //                 })
    //                     .then(() => {
    //                         User.findByIdAndUpdate(authenticatedUserId, {$push: {'projects': project_id}}, {'upsert': true}).exec()  // TODO: Take upsert out of this. Doesn't seem safe
    //                     })
    //                     .then(() => {
    //                         s3.putObject(
    //                             {
    //                                 Bucket: 'scholance-users',
    //                                 Key: authenticatedUserId + '/projects/' + project._id.toString() + '/'
    //                             }, function(err, data) {
    //                                 if (err) {
    //                                     console.log(err);
    //                                     callback(null, helper.createErrorResponse(503, 'There was an error creating the S3 bucket'));
    //                                 }
    //                                 else{
    //                                     callback(null, helper.createSuccessResponse(201, project));
    //                                 }
    //                                 /*
    //                                 data = {
    //                                  Location: "http://examplebucket.s3.amazonaws.com/"
    //                                 }
    //                                 */
    //                             });
    //                         // db.close();
    //                         // callback(null, {statusCode: 204});
    //                     })
    //                     .catch((err) => {
    //                         // db.close();
    //                         callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //                     })
    //                     .finally(() => {
    //                         db.close();
    //                     })
    //             }
    //         })
    //         .catch((err) => {
    //             db.close();
    //             callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //         })
    // });
};


/**
 * PROJECT SIGNOFF
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignoff = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to sign off of this project'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.student_id;


        entryService.projectSignoff(projectId, studentId, (err, project) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }




    // Authenticated user information

    // callback(null, {statusCode: 200, body: JSON.stringify(event)});

    // const principalId = event.requestContext.authorizer.principalId;
    // const auth = principalId.split("|");
    // const authenticationProvider = auth[0];
    // let authenticatedUserId = auth[1];
    // if (authenticationProvider !== 'auth0') {
    //     callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    // } else if (authenticatedUserId != event.pathParameters.user_id) {
    //     callback(null, helper.createErrorResponse(403, 'Student ID does not match authenticated user'));
    // }
    //
    // // Authorize the authenticated user's scopes
    // const scope = event.requestContext.authorizer.scope;
    // const scopes = scope.split(" ");
    // if (!scopes.includes("manage:entry")) {
    //     callback(null, helper.createErrorResponse(403, 'You must be a student to sign up for a project'));
    // }
    //
    // DBService.connect(mongoString, mongooseOptions);
    // let db = mongoose.connection;
    // db.on('error', () => {
    //     db.close();
    //     callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    // });
    //
    // let project_id = event.pathParameters.project_id;
    // if (!mongoose.Types.ObjectId.isValid(project_id)) {
    //     db.close();
    //     callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
    //     return;
    // }
    //
    // let data = JSON.parse(event.body);
    // db.once('open', () => {
    //     Project
    //         .findById(project_id)
    //         .then((project) => {
    //             if (!project) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(404, 'Project not found'));
    //             } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(404, 'You are not currently signed up for this project'));
    //             } else {
    //                 project.update({
    //                     $pull: {'entries': {student: authenticatedUserId}}
    //                 })
    //                     .then(() => {
    //                         User.findById(authenticatedUserId)
    //                             .then((user) => {
    //                                 let projectIndex = user.projects.indexOf(project_id);
    //                                 user.projects.splice(projectIndex, 1);
    //                                 user.save()
    //                                     .then(() => {
    //                                         db.close();
    //                                         callback(null, helper.createSuccessResponse(204));
    //                                     })
    //                             })
    //                             .catch((err) => {
    //                                 db.close();
    //                                 callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //                             });
    //                     })
    //                     .catch((err) => {
    //                         db.close();
    //                         callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //                     })
    //             }
    //         })
    //         .catch((err) => {
    //             db.close();
    //             callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //         })
    // });
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
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, helper.createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let entryUpdateRequest = {
        commentary: data.commentary,
        submissionStatus: data.submissionStatus
    };


    DBService.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'User is not signed up for this project'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == authenticatedUserId);
                    project.entries[entryIndex].submissionStatus = entryUpdateRequest.submissionStatus;
                    if (entryUpdateRequest.commentary) {
                        project.entries[entryIndex].commentary = entryUpdateRequest.commentary;
                    }
                    project.save()
                        .then((updatedProject) => {
                            db.close();
                            callback(null, helper.createSuccessResponse(201, updatedProject.entries[entryIndex].assets.slice(-1)[0]));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, helper.createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
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
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        db.close();
        callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);

    let newComment = {
        author: authenticatedUserId,
        text: data.text
    };

    DBService.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'Project not found'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == user_id);
                    console.log(entryIndex);
                    project.entries[entryIndex].comments.push(newComment);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, helper.createSuccessResponse(201, newProject.entries[entryIndex].comments.slice(-1)[0]));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, helper.createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
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
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;
    let comment_id = event.pathParameters.comment_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        db.close();
        callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    DBService.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'Project not found'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == user_id);
                    console.log(entryIndex);
                    let commentIndex = project.entries[entryIndex].comments.findIndex( comment => comment._id == comment_id);
                    project.entries[entryIndex].comments.splice(commentIndex, 1);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, helper.createSuccessResponse(204));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, helper.createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
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
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, helper.createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.user_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
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


    DBService.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'User is not signed up for this project'));
                } else {
                    let entryIndex = project.entries.findIndex( entry => entry.student == authenticatedUserId);
                    project.entries[entryIndex].assets.push(newAsset);
                    project.save()
                        .then((newProject) => {
                            db.close();
                            callback(null, helper.createSuccessResponse(201, newProject.entries[entryIndex].assets.slice(-1)[0]));
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, helper.createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
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
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, helper.createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let user_id = event.pathParameters.user_id;
    let project_id = event.pathParameters.project_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
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
        callback(null, helper.createErrorResponse(400, 'Invalid input'));
    }
    //pass the base64 string into a buffer
    let buffer = new Buffer(base64String, 'base64');
    let fileMime = fileType(buffer);
    // Check if the base64 encoded string is a file
    if (fileMime === null) {
        callback(null, helper.createErrorResponse(400, 'The string supplied is not a file type'));
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
            callback(null, helper.createErrorResponse(500, 'Could not upload to S3'));
        }

        DBService.connect(mongoString, mongooseOptions);
        let db = mongoose.connection;
        db.on('error', () => {
            db.close();
            callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
        });

        db.once('open', () => {
            Project
                .findById(project_id)
                .then((project) => {
                    if (!project) {
                        db.close();
                        callback(null, helper.createErrorResponse(404, 'Project not found'));
                    } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                        db.close();
                        callback(null, helper.createErrorResponse(404, 'User is not signed up for this project'));
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
                                callback(null, helper.createSuccessResponse(201, newAsset));
                            })
                            .catch((err) => {
                                db.close();
                                callback(null, helper.createErrorResponse(err.statusCode, err.message));
                            });
                    }
                })
                .catch((err) => {
                    db.close();
                    callback(null, helper.createErrorResponse(err.statusCode, err.message));
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
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    } else if (authenticatedUserId != event.pathParameters.user_id) {
        callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
        db.close();
    }

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:entry")) {
        callback(null, helper.createErrorResponse(403, 'You must be a student to manage a project entry'));
    }

    let project_id = event.pathParameters.project_id;
    let asset_id = event.pathParameters.asset_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)
        || !mongoose.Types.ObjectId.isValid(authenticatedUserId)
        || !mongoose.Types.ObjectId.isValid(asset_id)
    ) {
        db.close();
        callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    DBService.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    });

    db.once('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'Project not found'));
                } else if (!project.entries.some(entry => entry.student == authenticatedUserId)) {
                    db.close();
                    callback(null, helper.createErrorResponse(404, 'User is not signed up for this project'));
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
                                        callback(null, helper.createErrorResponse(500, 'Could not delete file from S3'));
                                    }
                                    callback(null, helper.createSuccessResponse(204));
                                });
                            } else {
                                callback(null, helper.createSuccessResponse(204));
                            }
                            db.close();
                        })
                        .catch((err) => {
                            db.close();
                            callback(null, helper.createErrorResponse(err.statusCode, err.message));
                        });
                }
            })
            .catch((err) => {
                db.close();
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            })
    });
};