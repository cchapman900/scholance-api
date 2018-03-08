"use strict";

const mongoose = require('mongoose');
const bluebird = require('bluebird');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fileType = require('file-type');
const validator = require('validator');
const Project = require('./models/project.js');

mongoose.Promise = bluebird;

const mongoString = process.env.MONGO_URI; // MongoDB Url

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 500,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({'message': message}),
});


/**
 * GET PROJECT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.getProject = (event, context, callback) => {
    mongoose.connect(mongoString);
    const db = mongoose.connection;
    const project_id = event.pathParameters.project_id;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        db.close();
        return;
    }

    db.on('error', () => {callback(null, createErrorResponse(503, 'There was an error connecting to the database'))});
    db.on('open', () => {
        Project
            .findById(project_id)
            .then((project) => {
                if (!project) {
                    callback(null, createErrorResponse(404, 'Project not found'));
                } else {
                    callback(null, {statusCode: 200, body: JSON.stringify(project)});
                }
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
 * LIST PROJECTS
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.listProjects = (event, context, callback) => {
    mongoose.connect(mongoString);
    const db = mongoose.connection;

    db.on('error', () => {callback(null, createErrorResponse(503, 'There was an error connecting to the database'))});
    db.once('open', () => {
        Project
            .find()
            .then((projects) => {
                callback(null, {statusCode: 200, body: JSON.stringify(projects)});
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
    mongoose.connect(mongoString);
    const db = mongoose.connection;
    let data = {};
    let errs = {};
    let project = {};

    data = JSON.parse(event.body);

    // Check to make sure the poster is a Business user
    if (data.liaison.userType !== 'business') {
        callback(null, createErrorResponse(403, 'You must be a business user to post a project'));
    }

    project = new Project({
        title: data.title,
        summary: data.summary,
        liaison: data.liaison._id,
        organization: {
            _id: data.organization._id,
            name: data.organization.name
        },
        fullDescription: data.fullDescription,
        category: data.category
    });

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
                        callback(null, {statusCode: 201, body: JSON.stringify({id: project._id})});
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
    mongoose.connect(mongoString);
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
                } else if (data.liaison._id != project.liaison) {
                    callback(null, createErrorResponse(403, 'Insufficient privileges'));
                    db.close();
                } else {
                    project.update({
                        title: data.title,
                        summary: data.summary,
                        liaison: data.liaison._id,
                        organization: {
                            _id: data.organization._id,
                            name: data.organization.name
                        },
                        fullDescription: data.fullDescription,
                        category: data.category
                    })
                        .then(() => {
                            callback(null, {statusCode: 200, body: JSON.stringify(project)});
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
    mongoose.connect(mongoString);
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
                } else if (data.liaison._id != project.liaison) {
                    callback(null, createErrorResponse(403, 'Insufficient privileges'));
                    db.close();
                } else {
                    project
                        .remove({_id: project_id})
                        .then(() => {
                            callback(null, {statusCode: 204});
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
 * PROJECT SIGNUP
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignup = (event, context, callback) => {
    mongoose.connect(mongoString);
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
                } else if (data.userType !== 'student') {
                    db.close();
                    callback(null, createErrorResponse(403, 'You must be a student to sign up for a project'));
                } else if (project.entries.some(element => element.student == data._id)) {
                    db.close();
                    callback(null, createErrorResponse(409, 'You are already signed up for this project'));
                } else {
                    project.update({
                        $push: {'entries': {student: data._id}}
                    })
                        .then(() => {
                            s3.putObject(
                                {
                                    Bucket: 'scholance-users',
                                    Key: data._id + '/projects/' + project._id.toString() + '/'
                                }, function(err, data) {
                                    if (err) {
                                        console.log(err);
                                        callback(null, createErrorResponse(503, 'There was an error creating the S3 bucket'));
                                    }
                                    else{
                                        console.log(data);
                                        callback(null, {statusCode: 201, body: JSON.stringify({id: project._id})});
                                    }
                                    /*
                                    data = {
                                     Location: "http://examplebucket.s3.amazonaws.com/"
                                    }
                                    */
                                });
                            db.close();
                            callback(null, {statusCode: 204});
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
 * PROJECT SIGNOFF
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignoff = (event, context, callback) => {
    mongoose.connect(mongoString);
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
                } else if (!project.entries.some(e => e.student == data._id)) {
                    db.close();
                    callback(null, createErrorResponse(404, 'You are not currently signed up for this project'));
                } else {
                    project.update({
                        $pull: {'entries': {student: data._id}}
                    })
                        .then(() => {
                            db.close();
                            callback(null, {statusCode: 204});
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
    let project_id = event.pathParameters.project_id;
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);
    //get the request
    let name = data.name;
    let base64String = data.file;
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
        mongoose.connect(mongoString);
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
                        project.update({
                            $push: {'supplementalResources': {name: fileName, assetType: 'image', uri: fileLink}} // TODO: fix assetType
                        })
                            .then(() => {
                                db.close();
                                callback(null, {statusCode: 201, body: JSON.stringify({'File URL': fileLink})});
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
 * UPLOAD SUBMISSION ASSET FILE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createSubmissionAssetFile = (event, context, callback) => {
    let project_id = event.pathParameters.project_id;
    let user_id = event.pathParameters.project_id;

    if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

    let data = JSON.parse(event.body);
    //get the request
    let name = data.name;
    let base64String = data.file;
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

    let bucketName = 'dev-scholance-projects';

    let filePath = project_id + '/submissions/' + user_id + '/assets/';
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
        // if the file object is uploaded successfully to s3 then you can get your full url
        callback(null, {statusCode: 201, body: JSON.stringify({'File URL': fileLink})});

        // TODO: Add to Submission
    })
};
