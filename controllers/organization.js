"use strict";

const helper = require('./_helper');
const constants = require('../lib/constants');

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
                console.error(event);
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
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organization));
        });
    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};


/**
 * CREATE ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createOrganization = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ORGANIZATION)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to create an organization'));
        }

        // Parse the request and append the authId
        let request = JSON.parse(event.body);
        request.liaisons = [authId];

        organizationService.create(request, (err, organization) => {
            if (err) {
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organization));
        });
    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};


/**
 * UPDATE ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updateOrganization = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        //TODO: Should need to be a part of the organization to update
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ORGANIZATION)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to update an organization'));
        }

        const organizationId = event.pathParameters.organization_id;

        // Parse the request and append the authId
        const request = JSON.parse(event.body);

        organizationService.update(organizationId, request, (err, organization) => {
            if (err) {
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organization));
        });
    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};


/**
 * ADD USER TO ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.addLiaisonToOrganization = (event, context, callback) => {

    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ORGANIZATION)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a business sign up to an organization'));
        }

        const organizationId = event.pathParameters.organization_id;
        const userId = event.pathParameters.user_id;

        organizationService.addLiaisonToOrganization(userId, organizationId, (err, organization) => {
            if (err) {
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organization));
        });
    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};


/**
 * REMOVE USER FROM ORGANIZATION
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.removeLiaisonFromOrganization = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ORGANIZATION)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a business sign up to an organization'));
        }

        const organizationId = event.pathParameters.organization_id;
        const userId = event.pathParameters.user_id;

        organizationService.removeLiaisonFromOrganization(userId, organizationId, (err, organization) => {
            if (err) {
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, organization));
        });
    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};
