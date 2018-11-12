const Organization = require('../models/organization');
const User = require('../models/user');

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
     * CREATE ORGANIZATION
     *
     * @param request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    create(request, callback) {

        const organization = new Organization({
            name: request.name,
            domain: request.domain,
            liaisons: request.liaisons
        });

        // Validate the request
        const errs = organization.validateSync();
        if (errs) throw new HTTPError(400, 'Organization data invalid');

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            Organization.create(organization)
                // TODO: Break this out
                .then((organization) => {
                    User.findByIdAndUpdate(organization.liaisons[0], {organization: organization._id})
                        .then(() => {
                            callback(null, organization);
                        })
                        .catch((err) => {
                            callback(err);
                        })
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