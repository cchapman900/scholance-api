const User = require('../models/user');

const HTTPError = require('../lib/errors');

class UserService {

    /**
     * Constructor
     *
     * @param dbService
     */
    constructor(dbService) {
        this.dbService = dbService;
    }


    /**
     * GET USER
     *
     * @param {string} user_id
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    get(user_id, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            User
                .findOne({_id: user_id})
                .populate({
                    path: 'projects',
                    select: '_id title organization liaison entries category status selectedStudentId',
                    populate: [
                        {
                            path: 'liaison',
                            select: 'name'
                        },
                        {
                            path: 'organization',
                            select: 'name'
                        },
                        {
                            path: 'entries.student',
                            select: 'name'
                        }
                    ]
                })
                .populate({
                    path: 'organization',
                    select: 'name domain'
                })
                .populate({
                    path: 'portfolioEntries.project.organization',
                    select: 'name'
                })
                .populate({
                    path: 'portfolioEntries.project.liaison',
                    select: 'name'
                })
                .then((user) => {
                    if (!user) {
                        console.log('User ' + user_id + ' not found');
                        return callback({statusCode: 404, message: 'User not found'})
                    } else {
                        return callback(null, user);
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
     * CREATE OR UPDATE USER
     *
     * @param request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    createOrUpdate(request, callback) {

        let user = new User({
            _id: request.userId,
            name: request.name,
            email: request.email,
            about: request.about,
            position: request.position,
            school: request.school,
            academicFocus: request.academicFocus,
            interests: request.interests,
            linkedin: request.linkedin,
            website: request.website,
            twitter: request.twitter,
            instagram: request.instagram,
        });

        if (request.userType) {
            user.userType = request.userType
        }

        // Validate the request
        const errs = user.validateSync();
        if (errs) {
            console.log(errs);
            callback(new HTTPError(400, 'User data invalid: ' + errs));
        }

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            User.findByIdAndUpdate(user._id, request, {'upsert': true})
                .then(() => {
                    callback(null, user);
                })
                .catch((err) => {
                    console.error(err);
                    callback(new HTTPError(err.statusCode, err.message));
                })
                .finally(() => {
                    db.close();
                });
        });
    };


    /**
     * DELETE USER
     *
     * @param {string} userId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    delete(userId, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            User
                .remove({_id: userId})
                .then(() => {
                    callback(null);
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

    /**
     * @param {string} userId
     * @param {{}} portfolioEntries
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    updatePortfolioEntries(userId, portfolioEntries, callback) {
        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            User.findByIdAndUpdate(userId, {portfolioEntries: portfolioEntries})
                .then(() => {
                    callback(portfolioEntries);
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

module.exports = UserService;