"use strict";

const helper = require('./_helper');

const User = require('../models/user.js');

const dbService = require('../utils/db');

const UserService = require('../services/user');
const userService = new UserService(dbService);


/**
 * GET USER
 *
 * @param {{pathParameters: {user_id: string}}} event
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.getUser = (event, context, callback) => {
    try {
        const userId = event.pathParameters.user_id;

        userService.get(userId, (err, user) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, user));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * CREATE OR UPDATE USER
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createOrUpdateUser = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const userId = event.pathParameters.user_id;

        if (userId !== authId) return callback(null, helper.createErrorResponse(403, 'Trying to update non-authenticated user'));

        // Parse the request and append the authId
        let request = JSON.parse(event.body);
        request.userId = userId;

        userService.createOrUpdate(request, (err, user) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, user));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * DELETE USER
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteUser = (event, context, callback) => {
    mongoose.connect(mongoString);
    const db = mongoose.connection;
    const user_id = event.pathParameters.user_id;

    if (!validator.isAlphanumeric(user_id)) {
        callback(null, helper.createErrorResponse(400, 'Incorrect id'));
        db.close();
        return;
    }

    db.once('open', () => {
        User
            .remove({_id: user_id})
            .then(() => {
                callback(null, helper.createSuccessResponse(204));
            })
            .catch((err) => {
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            });
    });
};


/**
 * UPDATE COMPLETED PROJECT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updatePortfolioEntries = (event, context, callback) => {

    // Authenticated user information
    const principalId = event.requestContext.authorizer.principalId;
    const auth = principalId.split("|");
    const authenticationProvider = auth[0];
    let authenticatedUserId = auth[1];
    if (authenticationProvider !== 'auth0') {
        callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    }

    // TODO: Add authorization

    const user_id = event.pathParameters.user_id;

    mongoose.connect(mongoString, mongooseOptions);
    let db = mongoose.connection;
    db.on('error', () => {
        db.close();
        callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    });

    const data = JSON.parse(event.body);

    let portfolioEntries = data.portfolioEntries;

    db.once('open', () => {
        // User.save() could be used too
        User.findByIdAndUpdate(user_id, {portfolioEntries: portfolioEntries})
            .then(() => {
                db.close();
                callback(null, helper.createSuccessResponse(200, portfolioEntries));
            })
            .catch((err) => {
                db.close();
                callback(err, helper.createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
                db.close();
            });
    });
};


/**
 * LIST ORGANIZATIONS
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.listOrganizations = (event, context, callback) => {
    mongoose.connect(mongoString);
    const db = mongoose.connection;
    const domain = event.queryStringParameters.domain;

    db.once('open', () => {
        Organization
            .find({domain: domain})
            .then((organizations) => {
                callback(null, helper.createSuccessResponse(200, organizations));
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
 * GET ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.getOrganization = (event, context, callback) => {
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
