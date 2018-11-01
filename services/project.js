const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fileType = require('file-type');

const Project = require('../models/project');
const User = require('../models/user');

class ProjectService {

    /**
     * Constructor
     *
     * @param dbService
     */
    constructor (dbService) {
        this.dbService = dbService;
    }


    /**
     * LIST PROJECT
     * Get a list of projects with the specified query
     *
     * @param queryStringParameters - An object of query string parameters.
     * @param callback
     */
    list(queryStringParameters = {}, callback) {

        // Get and validate the query string params (if set)
        const query = this.getValidListProjectsQueryParams(queryStringParameters);

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err)
        });
        db.once('open', () => {
            Project
                .find(query)
                .populate({path: 'organization', select: 'name'})
                .then((projects) => {
                    callback(null, projects);
                })
                .finally(() => {
                    db.close();
                })
        });
    };


    /**
     * GET PROJECT BY ID
     * Get a single project with the specified id
     *
     * @param projectId - A project's ObjectId.
     * @param showFullEntries
     * @param callback
     */
    get(projectId, showFullEntries, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err)
        });
        db.once('open', () => {
            let query = Project
                .findById(projectId)
                .populate({path: 'organization', select: 'name about'})
                .populate({path: 'liaison', select: 'name'})
                .populate({path: 'selectedEntry', select: 'name'})
                .populate({path: 'comments.author', select: 'name'});

            if (showFullEntries) {
                query
                    .populate({path: 'entries.student', select: 'name'})
            }

            query
                .then((project) => {
                    if (!project) {
                        callback({statusCode: 404, message: 'Project not found'});
                    } else {
                        callback(null, project);
                    }
                })
                .catch((err) => {
                    callback(err);
                })
                .finally(() => {
                    db.close();
                });
        });
    };


    create(request, callback) {

        // Create a Project from the request
        let project = new Project({
            _id: new mongoose.Types.ObjectId(),
            title: request.title,
            summary: request.summary,
            liaison: request.liaison,
            organization: request.organization,
            fullDescription: request.fullDescription,
            deliverables: request.deliverables,
            category: request.category,
            status: 'active'
        });
        if (request.deadline) {
            project.deadline = Date.parse(data.deadline)
        }

        // Validate the request
        const errs = project.validateSync();
        if (errs) return callback({statusCode: 400, message: 'Incorrect project data'});

        // Run the database query
        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err)
        });
        db.once('open', () => {

            // Create the project
            project
                .save()
                .then(() => {

                    // Add the project to the user's projects
                    User.findByIdAndUpdate(project.liaison, {$push: {'projects': project._id}})
                        // .then(() => {})
                        .catch((err) => {
                            console.error(err);
                            callback(err);
                        })
                })
                .then(() => {

                    // Prep the folder for the asset files
                    s3.putObject(
                        {
                            Bucket: 'scholance-projects',
                            Key: project._id.toString() + '/'
                        }, function(err, request) {
                            if (err) {
                                console.error(err);
                                callback({statusCode: 503, message: 'There was an error creating the S3 bucket'});
                            }
                            else{
                                callback(null, project);
                            }
                        });
                })
                .catch((err) => {
                    console.error(err);
                    callback(err);
                })
                .finally(() => {
                    db.close();
                });
        });
    };


    /*****************
     * FUNCTION TEMPLATE
     *****************/

    // template(callback) {
    //
    //     const db = this.dbService.connect();
    //     db.on('error', (err) => {
    //         callback(err)
    //     });
    //     db.once('open', () => {
    //         // Main body
    //     });
    // };


    /************************
     * HELPER METHODS
     ************************/

    /**
     * @param queryStringParameters
     * @returns {{}}
     */
    getValidListProjectsQueryParams(queryStringParameters) {
        const validQueryParams = ['status'];
        let query = {};
        if (queryStringParameters) {
            query = Object.keys(queryStringParameters)
                .filter(key => validQueryParams.includes(key))
                .reduce((obj, key) => {
                    obj[key] = queryStringParameters[key];
                    return obj;
                }, {});
        }
        return query;
    };
}

module.exports = ProjectService;