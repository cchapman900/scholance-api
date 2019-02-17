"use strict";

const helper = require('./_helper');
const constants = require('../lib/constants');

const User = require('../models/user.js');

const dbService = require('../lib/db');

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
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, user));
        });
    }
    catch(err) {
        console.error(event);
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
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, user));
        });
    }
    catch(err) {
        console.error(event);
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
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }
        const userId = event.pathParameters.user_id;

        if (userId !== authId) return callback(null, helper.createErrorResponse(403, 'Trying to delete non-authenticated user'));

        userService.delete(userId, (err, user) => {
            if (err) {
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(204));
        });
    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};


/**
 * UPDATE COMPLETED PROJECT ENTRY
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updatePortfolioEntries = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to update a portfolio entry'));
        }

        const data = JSON.parse(event.body);
        const portfolioEntries = data.portfolioEntries;

        userService.updatePortfolioEntries(userId, portfolioEntries, (err, portfolioEntries) => {
            if (err) {
                console.error(event);
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, portfolioEntries));
        });

    }
    catch(err) {
        console.error(event);
        console.error(err);
        throw err;
    }
};
