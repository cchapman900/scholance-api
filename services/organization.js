const Organization = require('../models/organization');

const HTTPError = require('../lib/errors');

class OrganizationService {

    /**
     * Constructor
     *
     * @param dbService
     */
    constructor(dbService) {
        this.dbService = dbService;
    }


    /**
     * @param {{domain: string}} query
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    list(query, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            let search = Organization
                .find();

            if (query.domain) {
                search.find({domain: query.domain})
            }

            search
                .then((organizations) => {
                    callback(null, organizations);
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
     * GET ORGANIZATION
     *
     * @param {string} organizationId
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    get(organizationId, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            Organization
                .findOne({_id: organizationId})
                .populate({path: 'liaisons', select: 'name photo position'})
                .then((organization) => {
                    if (!organization) {
                        throw new HTTPError(404, 'organization not found');
                    }
                    callback(null, helper.createSuccessResponse(200, organization));
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
        if (errs) throw new HTTPError(400, 'User data invalid');

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
                    throw new HTTPError(err.statusCode, err.message);
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

module.exports = OrganizationService;