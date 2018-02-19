"use strict";

const mongoose = require('mongoose');
const bluebird = require('bluebird');
const validator = require('validator');
const Project = require('./models/Project.js');

mongoose.Promise = bluebird;

const mongoString = process.env.MONGO_URI; // MongoDB Url

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: {'Content-Type': 'text/plain'},
    body: message || 'Incorrect id',
});

module.exports.getProject = (event, context, callback) => {
    const db = mongoose.connect(mongoString).connection;
    const id = event.pathParameters.id;

    if (!validator.isAlphanumeric(id)) {
        callback(null, createErrorResponse(400, 'Incorrect id'));
        db.close();
        return;
    }

    db.once('open', () => {
        Project
            .find({_id: event.pathParameters.id})
            .then((project) => {
                callback(null, {statusCode: 200, body: JSON.stringify(project)});
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


module.exports.listProjects = (event, context, callback) => {
    const db = mongoose.connect(mongoString).connection;

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


module.exports.createProject = (event, context, callback) => {
    let db = {};
    let data = {};
    let errs = {};
    let project = {};
    const mongooseId = '_id';

    db = mongoose.connect(mongoString).connection;

    data = JSON.parse(event.body);

    project = new Project({
        title: data.title,
        summary: data.summary,
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


    db.once('open', () => {
        project
            .save()
            .then(() => {
                callback(null, {statusCode: 200, body: JSON.stringify({id: project[mongooseId]})});
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            });
    });
};

module.exports.deleteProject = (event, context, callback) => {
    const db = mongoose.connect(mongoString).connection;
    const id = event.pathParameters.id;

    if (!validator.isAlphanumeric(id)) {
        callback(null, createErrorResponse(400, 'Incorrect id'));
        db.close();
        return;
    }

    db.once('open', () => {
        Project
            .remove({_id: event.pathParameters.id})
            .then(() => {
                callback(null, {statusCode: 204, body: JSON.stringify('Ok')});
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            });
    });
};

module.exports.updateProject = (event, context, callback) => {
    const db = mongoose.connect(mongoString).connection;
    const data = JSON.parse(event.body);
    const id = event.pathParameters.id;
    let errs = {};
    let project = {};

    if (!validator.isAlphanumeric(id)) {
        callback(null, createErrorResponse(400, 'Incorrect id'));
        db.close();
        return;
    }

    project = new Project({
        _id: id,
        title: data.title,
        summary: data.summary,
        fullDescription: data.fullDescription,
        category: data.category
    });

    errs = project.validateSync();

    if (errs) {
        callback(null, createErrorResponse(400, 'Incorrect parameter'));
        db.close();
        return;
    }

    db.once('open', () => {
        // Project.save() could be used too
        Project.findByIdAndUpdate(id, project)
            .then(() => {
                callback(null, {statusCode: 200, body: JSON.stringify('Ok')});
            })
            .catch((err) => {
                callback(err, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            });
    });
};