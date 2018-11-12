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
                    callback(null, organization);
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
     * @param {string} organizationId
     * @param {{}} request
     * @param {requestCallback} callback
     * @returns {requestCallback}
     */
    update(organizationId, request, callback) {

        const organizationRequest = {
            name: request.name,
            domain: request.domain,
            about: request.about,
            logo: request.position,
            industry: request.industry,
            linkedin: request.linkedin,
            twitter: request.twitter
        };

        const db = this.dbService.connect();
        db.on('error', (err) => {
            console.error(err);
            callback(err);
        });
        db.once('open', () => {
            Organization.findByIdAndUpdate(organizationId, organizationRequest)
                .then((organization) => {
                    callback(null, organization);
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

module.exports = OrganizationService;