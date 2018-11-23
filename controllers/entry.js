"use strict";

const helper = require('./_helper');
const constants = require('../lib/constants');

const Project = require('../models/project.js');
const User = require('../models/user.js');

const dbService = require('../lib/db');

const EntryService = require('../services/entry');
const entryService = new EntryService(dbService);



/**
 * GET ENTRY
 *
 * @param {{pathParameters: {project_id: string, user_id: string}, requestContext: {authorizer: {principalId: string}}}} event
 * @param context
 * @param callback
 */
module.exports.getEntryByStudentId = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.user_id;


        entryService.getByStudentId(projectId, studentId, (err, project) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * PROJECT SIGNUP
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignup = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to sign up for a project'));
        }

        const projectId = event.pathParameters.project_id;

        entryService.projectSignup(projectId, authId, (err, project) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(201, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * PROJECT SIGNOFF
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.projectSignoff = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            console.error('Insufficient permissions to sign off of project: ' + scopes);
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to sign off of this project'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.user_id;

        if (authId !== studentId) {
            console.error(authId + ' tried unsuccessfully to sign off of project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
        }


        entryService.projectSignoff(projectId, studentId, (err, project) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(204, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * UPDATE ENTRY
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.updateEntry = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to sign up for a project'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.user_id;

        if (authId !== studentId) {
            console.log(authId + ' tried unsuccessfully to update entry for project ' + projectId);
            callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
        }

        let request = JSON.parse(event.body);

        entryService.update(projectId, studentId, request, (err, entry) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, entry));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};



/*************************
 * ENTRY ASSETS
 *************************/


/**
 * UPLOAD ENTRY ASSET
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createEntryAsset = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to sign up for a project'));
        }

        const projectId = event.pathParameters.project_id;
        const studentId = event.pathParameters.user_id;

        if (authId !== studentId) {
            console.log(authId + ' tried unsuccessfully to add entry asset for project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
        }

        let request = JSON.parse(event.body);

        entryService.createAsset(projectId, studentId, request, (err, entry) => {
            if (err) {
                console.error(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(201, entry));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * UPLOAD ENTRY ASSET FROM A FILE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createEntryAssetFile = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.log('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            console.log('Update Project: Non-student User ' + authId + ' tried to add entry asset to project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to add a resource to a project'));
        }

        const request = JSON.parse(event.body);

        // Create the project
        entryService.createAssetFromFile(projectId, authId, request, (err, asset) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(201, asset));
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * DELETE ENTRY ASSET
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.deleteEntryAsset = (event, context, callback) => {

    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.log('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        const userId = event.pathParameters.user_id;
        const assetId = event.pathParameters.asset_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_ENTRY)) {
            console.log('Update Project: Non-student User ' + authId + ' tried to add entry asset to project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a student user to add a resource to a project entry'));
        }

        // Create the project
        entryService.deleteAsset(projectId, userId, assetId, (err, project) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(204, project));
        });
    }
    catch (err) {
        console.error(err);
        throw err;
    }
};



/*****************
 * ENTRY COMMENTS
 *****************/


/**
 * CREATE ENTRY COMMENT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createEntryComment = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.log('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        const entryStudentId = event.pathParameters.user_id;

        let request = JSON.parse(event.body);
        request.author = authId;

        // Create the project
        entryService.createEntryComment(projectId, entryStudentId, request, (err, project) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(201, project));
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * DELETE ENTRY COMMENT
 *
 * @param {{pathParameters: {project_id: string, user_id: string, [comment_id]: string}, requestContext: {authorizer: {principalId: string}}} event
 * @param context
 * @param callback
 */
module.exports.deleteEntryComment = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.log('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        const entryStudentId = event.pathParameters.user_id;
        const commentId = event.pathParameters.comment_id;

        let request = JSON.parse(event.body);
        request.author = authId;

        // Create the project
        entryService.deleteEntryComment(projectId, entryStudentId, commentId, (err, project) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(201, project));
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};
