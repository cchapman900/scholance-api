const mongoose = require('mongoose');

const Project = require('../models/project');
const User = require('../models/user');

const S3Util = require('../utils/s3');

class ProjectService {

    /**
     * Constructor
     *
     * @param {DBService} dbService
     */
    constructor (dbService) {
        this.dbService = dbService;
    }


    /**
     * LIST PROJECT
     * Get a list of projects with the specified query
     *
     * @param {{}} queryStringParameters - An object of query string parameters.
     * @param {requestCallback} callback
     */
    list(queryStringParameters = {}, callback) {

        // Get and validate the query string params (if set)
        const query = this.getValidListProjectsQueryParams(queryStringParameters);

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            return callback(err)
        });
        db.once('open', () => {
            Project
                .find(query)
                .populate({path: 'organization', select: 'name'})
                .then((projects) => {
                    return callback(null, projects);
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
     * @param {string} projectId - A project's ObjectId.
     * @param {boolean} showFullEntries - Whether to show deeper information about a project's entries
     * @param {requestCallback} callback
     */
    get(projectId, showFullEntries, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            return callback(err)
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
                        return callback({statusCode: 404, message: 'Project not found'});
                    } else {
                        return callback(null, project);
                    }
                })
                .catch((err) => {
                    return callback(err);
                })
                .finally(() => {
                    db.close();
                });
        });
    };


    /**
     * CREATE A PROJECT
     *
     * @param request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     * @callback {}
     */
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
            return callback(err)
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
                            return callback(err);
                        })
                })
                .then(() => {
                    const s3 = new S3Util();
                    s3.createProjectS3Bucket(project._id.toString(), (err) => {
                        if (err) {
                            console.error(err);
                            return callback({
                                statusCode: 503,
                                message: 'There was an error creating the S3 bucket'
                            });
                        }
                        return callback(null, project);
                    });
                })
                .catch((err) => {
                    console.error(err);
                    return callback(err);
                })
                .finally(() => {
                    db.close();
                });
        });
    };


    /*****************
     * FUNCTION TEMPLATE
     *****************/

    // /**
    //  * @param {requestCallback} callback
    //  * @returns {requestCallback}
    //  */
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
     * @returns {{}} - E.g. {status: 'active', limit: 10}
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


/**
 * @type {ProjectService}
 */
module.exports = ProjectService;