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