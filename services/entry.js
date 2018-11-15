const mongoose = require('mongoose');

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