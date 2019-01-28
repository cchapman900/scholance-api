"use strict";

const helper = require('./_helper');
const constants = require('../lib/constants');

const dbService = require('../lib/db');

const ProjectService = require('../services/project');
const projectService = new ProjectService(dbService);


/**
 * LIST PROJECTS
 *
 * @param event {{queryStringParameters: string[]}}
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.listProjects = (event, context, callback) => {
    try {
        projectService.list(event.queryStringParameters, (err, projects) => {
            if (err) {
                console.log(err);
                callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            callback(null, helper.createSuccessResponse(200, projects));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * GET PROJECT
 *
 * @param {{pathParameters: {project_id: string}}} event
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.getProject = (event, context, callback) => {
    try {
        const projectId = event.pathParameters.project_id;

        projectService.get(projectId, (err, project) => {
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
 * CREATE PROJECT
 *
 * @param {{body: string, pathParameters: {project_id}, requestContext: {authorizer: {principalId: string}}}} event
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.createProject = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_PROJECT)) {
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to post a project'));
        }

        // Parse the request and append the authId
        let request = JSON.parse(event.body);
        request.liaison = authId;

        // Create the project
        projectService.create(request, (err, project) => {
            if (err) {
                console.log(err);
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
 * UPDATE PROJECT
 *
 * @param {{body: string, pathParameters: {project_id}, requestContext: {authorizer: {principalId: string}}}} event
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.updateProject = (event, context, callback) => {
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
        if (!helper.scopesContainScope(scopes, "manage:project")) {
            console.error('Update Project: Non-business User ' + authId + ' tried to update project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to update a project'));
        }

        let request = JSON.parse(event.body);
        request.liaison = authId;

        // Create the project
        projectService.update(projectId, request, (err, project) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(200, project));
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * DELETE PROJECT
 *
 * @param {{body: string, pathParameters: {project_id}, requestContext: {authorizer: {principalId: string}}}} event
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.deleteProject = (event, context, callback) => {

    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Delete Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, "manage:project")) {
            console.error('Delete Project: Non-business User ' + authId + ' tried to delete project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to delete a project'));
        }

        projectService.delete(projectId, authId, (err) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(204));
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};


/**
 * UPDATE PROJECT STATUS
 *
 * @param {{body: string, pathParameters: {project_id}, requestContext: {authorizer: {principalId: string}}}} event
 * @param {{}} context
 * @param {requestCallback} callback
 */
module.exports.updateProjectStatus = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Update Project Status: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, "manage:project")) {
            console.error('Delete Project: Non-business User ' + authId + ' tried to update project status for ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to delete a project'));
        }

        let request = JSON.parse(event.body);

        const status = request.status;
        const selectedStudentId = request.selectedStudentId;

        projectService.updateProjectStatus(projectId, authId, status, selectedStudentId, (err, project) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            console.error(project);
            return callback(null, helper.createSuccessResponse(200, project));
        });
    }
    catch(err) {
        console.error(err);
        throw err;
    }

};



/*************************
 * SUPPLEMENTAL RESOURCE
 *************************/


/**
 * UPLOAD SUPPLEMENTAL RESOURCE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createSupplementalResource = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_PROJECT)) {
            console.error('Update Project: Non-business User ' + authId + ' tried to add resource to project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to add a resource to a project'));
        }

        const request = JSON.parse(event.body);

        // Create the project
        projectService.createSupplementalResource(projectId, request, (err, project) => {
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
 * UPLOAD SUPPLEMENTAL RESOURCE FILE
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createSupplementalResourceFile = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_PROJECT)) {
            console.error('Update Project: Non-business User ' + authId + ' tried to add resource to project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to add a resource to a project'));
        }

        const request = JSON.parse(event.body);

        // Create the project
        projectService.createSupplementalResourceFromFile(projectId, request, (err, project) => {
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
 * DELETE SUPPLEMENTAL RESOURCE ASSET
 *
 * @param {{body: string, pathParameters: {project_id: string, asset_id: string}, requestContext: {authorizer: {principalId: string}}}} event
 * @param context
 * @param callback
 */
module.exports.deleteSupplementalResource = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        const assetId = event.pathParameters.asset_id;

        // Authorize the authenticated user's scopes
        const scopes = helper.getScopes(event);
        if (!helper.scopesContainScope(scopes, constants.SCOPES.MANAGE_PROJECT)) {
            console.error('Update Project: Non-business User ' + authId + ' tried to add resource to project ' + projectId);
            return callback(null, helper.createErrorResponse(403, 'You must be a business user to add a resource to a project'));
        }

        // Create the project
        projectService.deleteSupplementalResource(projectId, assetId, (err) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            } else {
                return callback(null, helper.createSuccessResponse(204));
            }
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};



/*************************
 * COMMENTS
 *************************/


/**
 * CREATE PROJECT COMMENT
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.createProjectComment = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;

        let request = JSON.parse(event.body);
        request.author = authId;

        // Create the project
        projectService.createProjectComment(projectId, request, (err, project) => {
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
 * DELETE PROJECT COMMENT
 *
 * @param {{body: string, pathParameters: {project_id, comment_id}, requestContext: {authorizer: {principalId: string}}}} event
 * @param context
 * @param callback
 */
module.exports.deleteProjectComment = (event, context, callback) => {
    try {
        // Get the authenticated user id
        const authId = helper.getAuthId(event);
        if (!authId) {
            console.error('Update Project: No authentication found');
            return callback(null, helper.createErrorResponse(401, 'No authentication found'));
        }

        const projectId = event.pathParameters.project_id;
        let commentId = event.pathParameters.comment_id;

        // Create the project
        projectService.deleteProjectComment(projectId, commentId, (err, project) => {
            if (err) {
                console.error(err);
                return callback(null, helper.createErrorResponse(err.statusCode, err.message));
            }
            return callback(null, helper.createSuccessResponse(200, project));
        });

    }
    catch(err) {
        console.error(err);
        throw err;
    }
};
