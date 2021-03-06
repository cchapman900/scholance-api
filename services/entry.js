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
     * @param {EmailUtil} emailService
     */
    constructor (dbService, emailService) {
        this.dbService = dbService;
        this.emailService = emailService;
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
                        return callback(new HTTPError(404, 'Project not found'));
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
     * SIGN UP FOR A PROJECT
     *
     * @param {string} projectId
     * @param {string} studentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    projectSignup(projectId, studentId, callback) {

        let user = {};
        let project = {};

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            return callback(err);
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                .populate({path: 'liaison', select: ['name', 'email']})
                .then((foundProject) => {
                    if (!foundProject) {
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (foundProject.entries.some(element => element.student.toString() === studentId)) {
                        return callback(new HTTPError(409, 'You are already signed up for this project'));
                    }
                    project = foundProject;
                    return foundProject.updateOne({
                        $push: {'entries': {student: studentId, submissionStatus: 'active'}}
                    });
                })
                .then(() => {
                    return User.findByIdAndUpdate(studentId, {$push: {'projects': projectId}}).exec();
                })
                .then((foundUser) => {
                    user = foundUser;
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
                .then(() => {
                    return this.emailService.sendEmail(user.email, 'Project Registration Confirmation', `Hello ${user.name}! You have successfully signed up for ${project.title}.`);
                })
                .then(() => {
                    return this.emailService.sendEmail(project.liaison.email, 'Project Registration Notification', `Hello ${project.liaison.name}! This is a notification to let you know that a new student has recently signed up for signed up for ${project.title}.`);
                })
                .then(() => {
                    return this.emailService.sendEmail('chris@scholance.com', 'Project Registration Notification', `Hello! A student has recently signed up for signed up for ${project.title}.`);
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
     * SIGN OFF OF A PROJECT
     *
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
                    } // TODO: Else if the entry was selected, block the user from signing off
                    return project.update({
                        $pull: {'entries': {student: studentId}}
                    });
                })
                .then(() => {
                    return User.findByIdAndUpdate(studentId, {$pull: {'projects': projectId}}).exec();
                })
                .then(() => {
                    // Delete the folder with the assets
                    const s3 = new S3Util();
                    const entryPath = studentId + '/projects/' + projectId;
                    s3.deleteFolder(process.env.S3_USERS_BUCKET, entryPath, (err) => {
                        // TODO: Block this if the entry is selected
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

        let project = {};

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            let entryIndex;
            Project
                .findById(projectId)
                .populate({path: 'liaison', select: ['name', 'email']})
                .then((foundProject) => {
                    if (!foundProject) {
                        return callback(new HTTPError(404, 'Project not found'));
                    } else if (!foundProject.entries.some(entry => entry.student.toString() === studentId)) {
                        return callback(new HTTPError(404, 'User is not signed up for this project'));
                    }
                    entryIndex = foundProject.entries.findIndex(entry => entry.student.toString() === studentId);
                    foundProject.entries[entryIndex].submissionStatus = entryUpdateRequest.submissionStatus;
                    if (entryUpdateRequest.commentary) {
                        foundProject.entries[entryIndex].commentary = entryUpdateRequest.commentary;
                    }
                    project = foundProject;
                    return foundProject.save();
                })
                .then((updatedProject) => {
                    callback(null, updatedProject.entries[entryIndex]);
                })
                .then(() => {
                    return this.emailService.sendEmail(project.liaison.email, 'Project Submission Update', `Hello ${project.liaison.name}! This is a notification to let you know that an entry has been updated for ${project.title}.`);
                })
                .catch((err) => {
                    callback(err);
                })
                .finally(() => {
                    db.close();
                })
        });
    };



    /*********
     * ASSETS
     *********/


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
            return callback(err);
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
                    if (asset.mediaType === 'file') {
                        s3Util.deleteFile(process.env.S3_USERS_BUCKET, asset.uri, function(err) {
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



    /***********
     * COMMENTS
     ***********/


    /**
     * CREATE ENTRY COMMENT
     *
     * @param {string} projectId
     * @param {string} entryStudentId
     * @param {{author: string, text: string}} request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createEntryComment(projectId, entryStudentId, request, callback) {

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
                        const entryIndex = project.entries.findIndex( entry => entry.student.toString() === entryStudentId);
                        project.entries[entryIndex].comments.unshift(newComment);
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
     * DELETE ENTRY COMMENT
     *
     * @param {string} projectId
     * @param {string} entryStudentId
     * @param {string} commentId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    deleteEntryComment(projectId, entryStudentId, commentId, callback) {

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
                        const entryIndex = project.entries.findIndex( entry => entry.student.toString() === entryStudentId);
                        const commentIndex = project.entries[entryIndex].comments.findIndex( comment => comment._id.toString() === commentId);
                        project.entries[entryIndex].comments.splice(commentIndex, 1);
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
}


/**
 * @type {ProjectService}
 */
module.exports = EntryService;