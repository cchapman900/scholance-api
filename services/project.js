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
    get(projectId, callback) {

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
                .populate({path: 'comments.author', select: 'name'})
                .populate({path: 'entries.student', select: 'name'});

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
            specs: request.specs,
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
                category: request.category,
                deadline: request.deadline
            })
                .then((project) => {
                    if (!project) {
                        return callback(new HTTPError(404, 'could not find project'));
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
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (authId !== project.liaison.toString()) {
                        return callback(new HTTPError(403, 'You can only delete your own project'));
                    } else {
                        // TODO: Figure out what to do about S3 bucket
                        return project.remove({_id: projectId})
                    }
                })
                .then(() => {
                    return callback(null);
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
     * @param {string} selectedStudentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    updateProjectStatus(projectId, authId, status, selectedStudentId, callback) {

        if (!projectId || (!selectedStudentId && status==='complete')) {
            return callback(new HTTPError(400, 'Invalid request'));
        }

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
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (authId !== project.liaison.toString()) {
                        return callback(new HTTPError(403, 'You can only update your own project'));
                    } else {
                        return project;
                    }
                })
                .then((project) => {
                    project.status = status;
                    project.selectedStudentId = selectedStudentId;
                    return project.save();
                })
                .then((project) => {
                    if (status === 'complete') {
                        this.addCompletedProjectToStudentPortfolios(project, selectedStudentId, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            return callback(null, project);
                        });
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
                })
        });
    };


    /**
     * ADD PROJECT REWARD
     *
     * @param {string} projectId
     * @param {string} authId
     * @param {{amount: number}} reward
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    addProjectReward(projectId, authId, reward, callback) {

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
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (authId !== project.liaison.toString()) {
                        return callback(new HTTPError(403, 'You can only add a reward your own project'));
                    } else {
                        return project;
                    }
                })
                .then((project) => {
                    project.reward = reward;
                    project.reward.status = 'pending';
                    return project.save();
                })
                .then((project) => {
                    return callback(null, project);
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
     * UPDATE PROJECT REWARD
     *
     * @param {string} projectId
     * @param {string} authId
     * @param {{status: string}} reward
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    updateProjectReward(projectId, authId, reward, callback) {

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
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (authId !== project.liaison.toString()) {
                        return callback(new HTTPError(403, 'You can only add a reward your own project'));
                    } else {
                        return project;
                    }
                })
                .then((project) => {
                    project.reward.status = reward.status;
                    return project.save();
                })
                .then((project) => {
                    return callback(null, project);
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



    /*************************
     * SUPPLEMENTAL RESOURCES
     *************************/


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
                return callback(new HTTPError(500, 'Could not upload to S3'));
            }

            request.mediaType = file.mediaType;
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
            let assetIndex;
            let asset;
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        callback(new HTTPError(404, 'Project not found'));
                    }

                    assetIndex = project.supplementalResources.findIndex(asset => asset._id.toString() === assetId);
                    if (assetIndex === -1) {
                        return callback(new HTTPError(404, 'Asset not found'));
                    }
                    asset = project.supplementalResources.splice(assetIndex, 1);
                    return project.save()
                })
                .then(() => {
                    if (asset.mediaType === 'file') {
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
        });
    };



    /***********
     * COMMENTS
     ***********/


    /**
     * CREATE PROJECT COMMENT
     *
     * @param {string} projectId
     * @param {{author: string, text: string}} request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createProjectComment(projectId, request, callback) {

        const newComment = {
            author: request.author,
            text: request.text
        };

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
                        return callback(new HTTPError(404, 'Project not found'));
                    } else {
                        project.comments.unshift(newComment);
                        return project.save()
                    }
                })
                .then((project) => {
                    callback(null, project);
                })
                .catch((err) => {
                    console.error(err);
                    callback(err);
                })
                .finally(() => {
                    db.close();
                })
        });
    };

    /**
     * DELETE PROJECT COMMENT
     *
     * @param {string} projectId
     * @param {string} commentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    deleteProjectComment(projectId, commentId, callback) {

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
                        return callback(new HTTPError(404, 'Project not found'));
                    } else {
                        let commentIndex = project.comments.findIndex( comment => comment._id.toString() === commentId);
                        project.comments.splice(commentIndex, 1);
                        return project.save()
                    }
                })
                .then((project) => {
                    callback(null, project);
                })
                .catch((err) => {
                    console.error(err);
                    callback(err);
                })
                .finally(() => {
                    db.close();
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


    /**
     * ADD COMPLETE PROJECT TO ALL STUDENT PORTFOLIOS
     *
     * @param project
     * @param selectedStudentId
     * @param callback
     */
    addCompletedProjectToStudentPortfolios(project, selectedStudentId, callback) {
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
                        visible: true,
                        selected: entry.student.toString() === selectedStudentId
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
}


/**
 * @type {ProjectService}
 */
module.exports = ProjectService;