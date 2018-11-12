"use strict";

const helper = require('./_helper');
const constants = require('../lib/constants');

const Organization = require('../models/organization.js');

const dbService = require('../lib/db');

const OrganizationService = require('../services/organization');
const organizationService = new OrganizationService(dbService);


/**
 * LIST ORGANIZATIONS
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.listOrganizations = (event, context, callback) => {
    try {
        let query = {};

        const domain = ((event.queryStringParameters || {}).domain || null);

        if (domain) {
            query.domain = domain;
        }

        organizationService.list(query, (err, organizations) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organizations));
        });
    }
    catch (err) {
        throw err;
    }
};


/**
 * GET ORGANIZATION
 *
 * @param {{pathParameters: {organization_id: string}}} event
 * @param context
 * @param callback
 */
module.exports.getOrganization = (event, context, callback) => {
    try {
        const organizationId = event.pathParameters.organization_id;

        organizationService.get(organizationId, (err, organization) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organization));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }



    mongoose.connect(mongoString);
    const db = mongoose.connection;
    const organization_id = event.pathParameters.organization_id;

    if (!validator.isAlphanumeric(organization_id)) {
        callback(null, helper.createErrorResponse(400, 'Incorrect id'));
        db.close();
        return;
    }

    db.once('open', () => {
        Organization
            .findOne({_id: organization_id})
            .populate({path: 'liaisons', select: 'name photo position'})
            .then((organization) => {
                callback(null, helper.createSuccessResponse(200, organization));
            })
            .catch((err) => {
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                // Close db connection or node event loop won't exit , and lambda will timeout
                db.close();
            });
    });
};


/**
 * CREATE ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createOrganization = (event, context, callback) => {
    // // Authenticated user information
    // const principalId = event.requestContext.authorizer.principalId;
    // const auth = principalId.split("|");
    // const authenticationProvider = auth[0];
    // let authenticatedUserId = auth[1];
    // if (authenticationProvider !== 'auth0') {
    //     callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    //     db.close();
    // }
    //
    // // Authorize the authenticated user's scopes
    // const scope = event.requestContext.authorizer.scope;
    // const scopes = scope.split(" ");
    // if (!scopes.includes("manage:project")) {
    //     callback(null, helper.createErrorResponse(403, 'You must be a business user to delete a project'));
    // }
    //
    // mongoose.connect(mongoString);
    // const db = mongoose.connection;
    // const data = JSON.parse(event.body);
    //
    // organization = new Organization({
    //     name: data.name,
    //     domain: data.domain,
    //     liaisons: [authenticatedUserId]
    // });
    //
    // errs = organization.validateSync();
    //
    // if (errs) {
    //     callback(null, helper.createErrorResponse(400, 'Incorrect parameter'));
    //     db.close();
    //     return;
    // }
    //
    // db.once('open', () => {
    //     Organization.create(organization)
    //         .then((organization) => {
    //             User.findByIdAndUpdate(authenticatedUserId, {organization: organization._id})
    //                 .then(() => {
    //                     db.close();
    //                     callback(null, helper.createSuccessResponse(201, organization));
    //                 })
    //                 .catch((err) => {
    //                     db.close();
    //                     callback(err, helper.createErrorResponse(err.statusCode, err.message));
    //                 })
    //         })
    //         .catch((err) => {
    //             db.close();
    //             callback(err, helper.createErrorResponse(err.statusCode, err.message));
    //         })
    // });
};


/**
 * UPDATE ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updateOrganization = (event, context, callback) => {
    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
        db.close();
    }
    const organization_id = event.pathParameters.organization_id;

    // Authorize the authenticated user's scopes
    const scope = event.requestContext.authorizer.scope;
    const scopes = scope.split(" ");
    if (!scopes.includes("manage:project")) {
        callback(null, helper.createErrorResponse(403, 'You must be a business user to update a project'));
    }

    const data = JSON.parse(event.body);
    const request = {
        name: data.name,
        domain: data.domain,
        about: data.about,
        logo: data.position,
        industry: data.industry,
        linkedin: data.linkedin,
        twitter: data.twitter
    };

    mongoose.connect(mongoString);
    const db = mongoose.connection;

    db.once('open', () => {
        Organization.findByIdAndUpdate(organization_id, request)
            .then((organization) => {
                db.close();
                callback(null, helper.createSuccessResponse(201, organization));
            })
            .catch((err) => {
                db.close();
                callback(err, helper.createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * ADD USER TO ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.addLiaisonToOrganization = (event, context, callback) => {
    mongoose.connect(mongoString);
    const db = mongoose.connection;
    // TODO: Add authentication

    const organization_id = mongoose.Types.ObjectId(event.pathParameters.organization_id);
    const user_id = mongoose.Types.ObjectId(event.pathParameters.user_id);

    db.once('open', () => {
        User.findById(user_id)
            .then((user) => {
                if (user.userType !== 'business') {
                    db.close();
                    callback(null, helper.createErrorResponse(403, 'Must be a Business user to add organization'));
                }
                Organization.findById(organization_id)
                    .then((organization) => {
                        if (!organization) {
                            callback(null, helper.createErrorResponse(404, 'Organization not found'));
                        } else if (organization.liaisons.indexOf(user_id) !== -1) {
                            db.close();
                            callback(null, helper.createErrorResponse(409, 'User is already associated with this organization'));
                        } else {
                            organization.liaisons.push(mongoose.Types.ObjectId(user_id));
                            organization.save((err) => {
                                if (err) {
                                    db.close();
                                    callback(err, helper.createErrorResponse(500, 'Error saving organization'));
                                } else {
                                    console.log('test');
                                    user.update({'organization': organization_id})
                                        .then(() => {
                                            db.close();
                                            callback(null, helper.createSuccessResponse(200, organization));
                                        })
                                        .catch((err) => {
                                            db.close();
                                            callback(null, helper.createErrorResponse(500, 'Error saving user'));
                                        })

                                }
                            });

                        }
                    })
                    .catch((err) => {
                        db.close();
                        callback(err, helper.createErrorResponse(err.statusCode, err.message));
                    })
            })
            .catch((err) => {
                db.close();
                callback(err, helper.createErrorResponse(err.statusCode, err.message));
            })
    });
};


/**
 * REMOVE USER FROM ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.removeLiaisonFromOrganization = (event, context, callback) => {
    mongoose.connect(mongoString);
    const db = mongoose.connection;
    // TODO: Add authentication

    const organization_id = mongoose.Types.ObjectId(event.pathParameters.organization_id);
    const user_id = mongoose.Types.ObjectId(event.pathParameters.user_id);

    db.once('open', () => {
        Organization.findById(organization_id)
            .then((organization) => {
                if (!organization) {
                    callback(null, helper.createErrorResponse(404, 'Organization not found'));
                } else if (organization.liaisons.indexOf(user_id) === -1) {
                    db.close();
                    callback(null, helper.createErrorResponse(409, 'User is not currently associated with this organization'));
                } else {
                    organization.liaisons.pull(mongoose.Types.ObjectId(user_id));
                    organization.save((err) => {
                        if (err) {
                            db.close();
                            callback(err, helper.createErrorResponse(500, 'Error saving organization'));
                        } else {
                            User.findByIdAndUpdate(user_id, {'organization': null})
                                .then(() => {
                                    db.close();
                                    callback(null, helper.createSuccessResponse(200, organization));
                                })
                                .catch((err) => {
                                    db.close();
                                    callback(null, helper.createErrorResponse(500, 'Error saving user'));
                                })

                        }
                    });

                }
            })
            .catch((err) => {
                db.close();
                callback(err, helper.createErrorResponse(err.statusCode, err.message));
            })
    });
};
