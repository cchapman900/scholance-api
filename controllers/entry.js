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
 * @param {{pathParameters: {project_id: string, student_id: string}, requestContext: {authorizer: {principalId: string}}}} event
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
        const studentId = event.pathParameters.student_id;


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
        const studentId = event.pathParameters.student_id;

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
        const studentId = event.pathParameters.student_id;

        if (authId !== studentId) {
            console.log(authId + ' tried unsuccessfully to add entry asset for project ' + projectId);
            callback(null, helper.createErrorResponse(403, 'You do not have access to this project entry'));
        }

        let request = JSON.parse(event.body);

        entryService.createAsset(projectId, studentId, request, (err, entry) => {
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
            return callback(null, helper.createSuccessResponse(200, asset));
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




    // // Authenticated user information
    // const principalId = event.requestContext.authorizer.principalId;
    // const auth = principalId.split("|");
    // const authenticationProvider = auth[0];
    // let authenticatedUserId = auth[1];
    // if (authenticationProvider !== 'auth0') {
    //     callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    // }
    //
    // let project_id = event.pathParameters.project_id;
    // let user_id = event.pathParameters.user_id;
    //
    // if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
    //     db.close();
    //     callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
    //     return;
    // }
    //
    // let data = JSON.parse(event.body);
    //
    // let newComment = {
    //     author: authenticatedUserId,
    //     text: data.text
    // };
    //
    // DBService.connect(mongoString, mongooseOptions);
    // let db = mongoose.connection;
    // db.on('error', () => {
    //     db.close();
    //     callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    // });
    //
    // db.once('open', () => {
    //     Project
    //         .findById(project_id)
    //         .then((project) => {
    //             if (!project) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(404, 'Project not found'));
    //             } else {
    //                 let entryIndex = project.entries.findIndex( entry => entry.student == user_id);
    //                 console.log(entryIndex);
    //                 project.entries[entryIndex].comments.push(newComment);
    //                 project.save()
    //                     .then((newProject) => {
    //                         db.close();
    //                         callback(null, helper.createSuccessResponse(201, newProject.entries[entryIndex].comments.slice(-1)[0]));
    //                     })
    //                     .catch((err) => {
    //                         db.close();
    //                         callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //                     });
    //             }
    //         })
    //         .catch((err) => {
    //             db.close();
    //             callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //         })
    // });
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





    // // Authenticated user information
    // const principalId = event.requestContext.authorizer.principalId;
    // const auth = principalId.split("|");
    // const authenticationProvider = auth[0];
    // let authenticatedUserId = auth[1];
    // if (authenticationProvider !== 'auth0') {
    //     callback(null, helper.createErrorResponse(401, 'No Auth0 authentication found'));
    // }
    //
    // let project_id = event.pathParameters.project_id;
    // let user_id = event.pathParameters.user_id;
    // let comment_id = event.pathParameters.comment_id;
    //
    // if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
    //     db.close();
    //     callback(null, helper.createErrorResponse(400, 'Invalid ObjectId'));
    //     return;
    // }
    //
    // DBService.connect(mongoString, mongooseOptions);
    // let db = mongoose.connection;
    // db.on('error', () => {
    //     db.close();
    //     callback(null, helper.createErrorResponse(503, 'There was an error connecting to the database'));
    // });
    //
    // db.once('open', () => {
    //     Project
    //         .findById(project_id)
    //         .then((project) => {
    //             if (!project) {
    //                 db.close();
    //                 callback(null, helper.createErrorResponse(404, 'Project not found'));
    //             } else {
    //                 let entryIndex = project.entries.findIndex( entry => entry.student == user_id);
    //                 console.log(entryIndex);
    //                 let commentIndex = project.entries[entryIndex].comments.findIndex( comment => comment._id == comment_id);
    //                 project.entries[entryIndex].comments.splice(commentIndex, 1);
    //                 project.save()
    //                     .then((newProject) => {
    //                         db.close();
    //                         callback(null, helper.createSuccessResponse(204));
    //                     })
    //                     .catch((err) => {
    //                         db.close();
    //                         callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //                     });
    //             }
    //         })
    //         .catch((err) => {
    //             db.close();
    //             callback(null, helper.createErrorResponse(err.statusCode, err.message));
    //         })
    // });
};
