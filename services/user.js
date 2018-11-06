const User = require('../models/user');

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
                    select: '_id title organization liaison entries category status',
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
                    return callback(err);
                })
                .finally(() => {
                    // Close db connection or node event loop won't exit , and lambda will timeout
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