const HTTPError = require('../lib/errors');

const Project = require('../models/project');
const User = require('../models/user');

const AssetUtil = require('../lib/asset');
const S3Util = require('../lib/s3');

class EntryService {

    /**
     * Constructor
     *
     * @param {DBService} dbService
     */
    constructor (dbService) {
        this.dbService = dbService;
    }


    /**
     * GET ENTRY BY STUDENT ID
     *
     * @param {string} projectId
     * @param {string} studentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    getByStudentId(projectId, studentId, callback) {
        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            return callback(err)
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                .populate({path: 'entries.student', select: 'name'})
                .populate({path: 'entries.comments.author', select: 'name'})
                .then((project) => {
                    if (!project) {
                        callback(new HTTPError(404, 'Project not found'));
                    } else {
                        const entry = project.entries.find(entry => entry.student._id.toString() === studentId);
                        if (entry) {
                            callback(null, entry);
                        } else {
                            callback(new HTTPError(404, 'Entry not found'));
                        }
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


    /**
     * @param {string} projectId
     * @param {string} studentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    projectSignup(projectId, studentId, callback) {

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
                    } else if (project.entries.some(element => element.student.toString() === studentId)) {
                        return callback(new HTTPError(409, 'You are already signed up for this project'));
                    }
                    return project.update({
                        $push: {'entries': {student: studentId, submissionStatus: 'active'}}
                    });
                })
                .then(() => {
                    return User.findByIdAndUpdate(studentId, {$push: {'projects': projectId}}).exec();
                })
                .then(() => {
                    // Prepare a folder to put the project assets in
                    const s3 = new S3Util();
                    const entryPath = studentId + '/projects/' + projectId;
                    s3.createFolder(process.env.S3_USERS_BUCKET, entryPath, (err) => {
                        if (err) {
                            console.error(err);
                            return callback(new HTTPError(503, 'There was an error creating the S3 bucket'));
                        }
                        return callback(null);
                    });
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
     * @param {string} projectId
     * @param {string} studentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    projectSignoff(projectId, studentId, callback) {

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
                    } else if (!project.entries.some(element => element.student.toString() === studentId)) {
                        return callback(new HTTPError(409, 'You are not currently signed up for this project'));
                    }
                    return project.update({
                        $pull: {'entries': {student: studentId}}
                    });
                })
                .then(() => {
                    return User.findByIdAndUpdate(studentId, {$pull: {'projects': projectId}}).exec();
                })
                .then(() => {
                    // Prepare a folder to put the project assets in
                    const s3 = new S3Util();
                    const entryPath = studentId + '/projects/' + projectId;
                    s3.deleteFolder(process.env.S3_USERS_BUCKET, entryPath, (err) => {
                        // TODO: What if the project is completed
                        if (err) {
                            console.error(err);
                            return callback(new HTTPError(503, 'There was an error deleting the S3 bucket'));
                        }
                        return callback(null);
                    });
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
     * UPDATE ENTRY
     *
     * @param {string} projectId
     * @param {string} studentId
     * @param {{commentary: string, submissionStatus: string}} request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    update(projectId, studentId, request, callback) {

        const entryUpdateRequest = {
            commentary: request.commentary,
            submissionStatus: request.submissionStatus
        };

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            let entryIndex;
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (!project.entries.some(entry => entry.student.toString() === studentId)) {
                        return callback(new HTTPError(404, 'User is not signed up for this project'));
                    }
                    entryIndex = project.entries.findIndex(entry => entry.student.toString() === studentId);
                    project.entries[entryIndex].submissionStatus = entryUpdateRequest.submissionStatus;
                    if (entryUpdateRequest.commentary) {
                        project.entries[entryIndex].commentary = entryUpdateRequest.commentary;
                    }
                    return project.save();
                })
                .then((updatedProject) => {
                    callback(null, updatedProject.entries[entryIndex]);
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
     * CREATE ENTRY ASSET
     *
     * @param {string} projectId
     * @param {string} studentId
     * @param {{}} request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createAsset(projectId, studentId, request, callback) {

        const assetUtil = new AssetUtil();

        let asset;
        try {
            asset = assetUtil.createAssetFromRequest(request);
        }
        catch (err) {
            return callback(new HTTPError(400, 'Invalid request input'))
        }

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            let entryIndex;
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        callback(new HTTPError(404, 'Project not found'));
                    } else if (!project.entries.some(entry => entry.student.toString() === studentId)) {
                        return callback(new HTTPError(404, 'User is not signed up for this project'));
                    }
                    entryIndex = project.entries.findIndex(entry => entry.student.toString() === studentId);
                    project.entries[entryIndex].assets.push(asset);
                    return project.save();
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
    }


    /**
     * CREATE ENTRY ASSET FROM FILE
     *
     * @param {string} projectId
     * @param {string} studentId
     * @param {{name: string, file: string, mediaType: string, uri: string}} request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createAssetFromFile(projectId, studentId, request, callback) {

        const assetUtil = new AssetUtil();
        const s3Util = new S3Util();

        const file = assetUtil.getFileFromRequest(request);
        const assetPath = studentId + '/projects/' + projectId;

        s3Util.uploadFile(process.env.S3_USERS_BUCKET, assetPath, file, (err, fileUri) => {
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
                            db.close();
                            callback(new HTTPError(404, 'Project not found'));
                        } else if (!project.entries.some(entry => entry.student.toString() === studentId)) {
                            db.close();
                            callback(new HTTPError(404, 'User is not signed up for this project'));
                        } else {
                            let entryIndex = project.entries.findIndex( entry => entry.student.toString() === studentId);
                            project.entries[entryIndex].assets.push(asset);
                            return project.save()
                        }
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
     * DELETE AN ASSET
     *
     * @param {string} projectId
     * @param {string} userId
     * @param {string} assetId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    deleteAsset(projectId, userId, assetId, callback) {

        const s3Util = new S3Util();

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            let asset = {};
            Project
                .findById(projectId)
                .then((project) => {
                    if (!project) {
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (!project.entries.some(entry => entry.student.toString() === userId)) {
                        return callback(new HTTPError(404, 'User is not signed up for this project'));
                    } else {
                        let entryIndex = project.entries.findIndex(entry => entry.student.toString() === userId);
                        let entry = project.entries[entryIndex];
                        let assetIndex = entry.assets.findIndex(asset => asset._id.toString() === assetId);
                        asset = project.entries[entryIndex].assets.splice(assetIndex, 1);
                        return project.save();
                    }
                })
                .then(() => {
                    if (asset.mediaType === 'image') {
                        s3Util.deleteFile(process.env.S3_USERS_BUCKET, asset.uri, function(err, data) {
                            if (err) {
                                return callback(new HTTPError(500, 'Could not delete file from S3'));
                            }
                            return callback(null);
                        });
                    } else {
                        return callback(null);
                    }
                })
                .catch((err) => {
                    return callback(err);
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
}


/**
 * @type {ProjectService}
 */
module.exports = EntryService;