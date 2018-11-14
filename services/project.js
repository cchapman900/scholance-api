const mongoose = require('mongoose');

const HTTPError = require('../lib/errors');

const Project = require('../models/project');
const User = require('../models/user');

const AssetUtil = require('../lib/asset');
const S3Util = require('../lib/s3');

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
            project.deadline = Date.parse(request.deadline)
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
                    return User.findByIdAndUpdate(project.liaison, {$push: {'projects': project._id}}).exec()
                })
                .then(() => {
                    // Prepare a folder to put the project assets in
                    const s3 = new S3Util();
                    s3.createFolder(process.env.S3_PROJECTS_BUCKET, project._id.toString(), (err) => {
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


    /**
     * UPDATE PROJECT
     *
     * @param projectId
     * @param request
     * @param {requestCallback} callback
     *
     * @returns {requestCallback}
     */
    update(projectId, request, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            callback(err)
        });
        db.once('open', () => {
            Project.findByIdAndUpdate(projectId, {
                title: request.title,
                summary: request.summary,
                liaison: request.liaison,
                organization: request.organization,
                fullDescription: request.fullDescription,
                specs: request.specs,
                deliverables: request.deliverables,
                category: request.category
            })
                .then((project) => {
                    if (!project) {
                        throw new HTTPError(404, 'could not find project');
                    } else {
                        return callback(null, project);
                    }
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


    /**
     * DELETE A PROJECT
     *
     * @param {string} projectId
     * @param {string} authId
     * @param {requestCallback} callback
     *
     * @returns {requestCallback}
     */
    delete(projectId, authId, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            return callback(err)
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        return callback({statusCode: 404, message: 'Project not found'});
                    } else if (authId !== project.liaison) {
                        return callback({statusCode: 403, message: 'You can only delete your own project'});
                    } else {
                        project
                            .remove({_id: projectId})
                            .then(() => {
                                return callback(null, createSuccessResponse(204));
                            })
                            .catch((err) => {
                                return callback(err);
                            })
                    }
                })
                .catch((err) => {
                    console.error(err);
                    return callback(err);
                })
                .finally(() => {
                    db.close();
                })
        });
    };


    /**
     * UPDATE PROJECT STATUS
     *
     * @param {string} projectId
     * @param {string} authId
     * @param {string} status
     * @param {string} selectedEntryId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    updateProjectStatus(projectId, authId, status, selectedEntryId, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        throw new HTTPError(404, 'Project not found');
                    } else if (authId !== project.liaison.toString()) {
                        throw new HTTPError(403, 'You can only update your own project');
                    } else {
                        return project;
                    }
                })
                .then(() => {
                    return Project.findByIdAndUpdate(projectId, {status: status}, {new: true});
                })
                .then((project) => {
                    if (status === 'complete') {
                        // TODO THis is broken
                        this.addCompletedProjectToStudentPortfolios(project, (err, project) => {
                            console.log(project);
                            return callback(null, project);
                        });
                    }
                })
                .catch((err) => {
                    console.error(err);
                    return callback(err);
                })
                .finally(() => {
                    db.close();
                })
        });
    };


    /**
     * UPDATE PORTFOLIO ENTRY
     *
     * @param project
     * @param callback
     */
    addCompletedProjectToStudentPortfolios(project, callback) {
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
                .then(() => {
                    itemsProcessed++;
                    if (itemsProcessed === array.length) {
                        return callback(null, project);
                    }
                })
                .catch((err) => {
                    throw err;
                })
        });
    }


    ///////////////////////////
    // SUPPLEMENTAL RESOURCES
    ///////////////////////////

    /**
     * CREATE SUPPLEMENTAL RESOURCE
     *
     * @param projectId
     * @param request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createSupplementalResource(projectId, request, callback) {

        const assetUtil = new AssetUtil();

        const asset = assetUtil.createAssetFromRequest(request);

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        callback(new HTTPError(404, 'Project not found'));
                    }
                    return project.update({
                        $push: {'supplementalResources': asset}
                    })
                })
                .then(() => {
                    callback(null, asset);
                })
                .catch((err) => {
                    callback(err);
                })
                .finally(() => {
                    db.close();
                })
        });
    };


    /**
     * CREATE SUPPLEMENTAL RESOURCE FROM FILE
     *
     * @param projectId
     * @param request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createSupplementalResourceFromFile(projectId, request, callback) {

        const assetUtil = new AssetUtil();
        const s3Util = new S3Util();

        const file = assetUtil.getFileFromRequest(request);
        const assetPath = projectId + '/supplemental-resources';

        s3Util.uploadFile(process.env.S3_PROJECTS_BUCKET, assetPath, file, (err, fileUri) => {
            if (err) {
                callback(new HTTPError(500, 'Could not upload to S3'));
            }

            request.mediaType = file.mediaType
            request.uri = fileUri;
            const asset = assetUtil.createAssetFromRequest(request);

            const db = this.dbService.connect();
            db.on('error', (err) => {
                console.error(err);
                callback(err);
            });
            db.once('open', () => {
                Project
                    .findById(projectId)
                    .then((project) => {
                        if (!project) {
                            callback(new HTTPError(404, 'Project not found'));
                        }
                        return project.update({
                            $push: {'supplementalResources': asset}
                        })
                    })
                    .then(() => {
                        callback(null, asset);
                    })
                    .catch((err) => {
                        callback(err);
                    })
                    .finally(() => {
                        db.close();
                    })
            });
        });
    };


    /**
     * DELETE SUPPLEMENTAL RESOURCE
     *
     * @param projectId
     * @param assetId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    deleteSupplementalResource(projectId, assetId, callback) {

        const s3Util = new S3Util();

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                .then((project) => {
                    console.log(project);
                    if (!project) {
                        callback(new HTTPError(404, 'Project not found'));
                    }

                    const assetIndex = project.supplementalResources.findIndex( asset => asset._id.toString() === assetId);

                    if (assetIndex === -1) {
                        return callback(new HTTPError(404, 'Asset not found'));
                    }

                    const asset = project.supplementalResources.splice(assetIndex, 1);
                    console.log(asset);
                    project.save()
                        .then(() => {
                            if (asset.mediaType === 'image') {
                                s3Util.deleteFile(process.env.S3_PROJECTS_BUCKET, asset.uri, (err) => {
                                    if (err) {
                                        return callback(new HTTPError(500, 'Could not delete file from S3'));
                                    }
                                    callback(null);
                                });
                            } else {
                                callback(null);
                            }
                        })
                        .catch((err) => {
                            callback(err);
                        })
                        .finally(() => {
                            db.close();
                        })
                })
                .catch((err) => {
                    db.close();
                    callback(err);
                })
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
    //         console.error(err);
    //         callback(err);
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