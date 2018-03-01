"use strict";

const mongoose = require('mongoose');
const bluebird = require('bluebird');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
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
        liaison: {
            _id: data.liaison._id,
            name: data.liaison.name,
            userType: data.liaison.userType,
        },
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
                } else if (data.liaison._id != project.liaison._id) {
                    callback(null, createErrorResponse(403, 'Insufficient privileges'));
                    db.close();
                } else {
                    project.update({
                        title: data.title,
                        summary: data.summary,
                        liaison: {
                            _id: data.liaison._id,
                            name: data.liaison.name,
                            userType: data.liaison.userType,
                        },
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
                } else if (data.liaison._id != project.liaison._id) {
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
    let project_id = event.pathParameters.project_id;
    let data = {};
    data = JSON.parse(event.body);

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

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
                } else if (data.userType !== 'student') {
                    db.close();
                    callback(null, createErrorResponse(403, 'You must be a student to sign up for a project'));
                } else if (project.registrants.some(element => element._id == data._id)) {
                    db.close();
                    callback(null, createErrorResponse(409, 'You are already signed up for this project'));
                } else {
                    project.update({
                        $push: {'registrants': {_id: data._id, name: data.name, userType: data.userType}}
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
    let project_id = event.pathParameters.project_id;
    let data = {};
    data = JSON.parse(event.body);

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        db.close();
        callback(null, createErrorResponse(400, 'Invalid ObjectId'));
        return;
    }

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
                } else if (!project.registrants.some(e => e._id == data._id)) {
                    db.close();
                    callback(null, createErrorResponse(404, 'You are not currently signed up for this project'));
                } else {
                    project.update({
                        $pull: {'registrants': {_id: data._id}}
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
