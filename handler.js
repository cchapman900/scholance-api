"use strict";

const mongoose = require('mongoose');
const bluebird = require('bluebird');
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
                callback(null, {statusCode: 201, body: JSON.stringify({id: project._id})});
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

    db.on('error', () => {callback(null, createErrorResponse(503, 'There was an error connecting to the database'))});
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
        callback(null, createErrorResponse(503, 'There was an error connecting to the database'));
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
