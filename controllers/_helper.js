/**
 * Create a Success Response
 *
 * @param statusCode
 * @param body
 * @returns object - {statusCode: number, headers: object, body: string}
 */
module.exports.createSuccessResponse = (statusCode, body) => {
    return {
        statusCode: statusCode || 200,
        headers: {
            'Access-Control-Allow-Origin' : '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    };
};


/**
 * Create an Error Response
 *
 * @param statusCode
 * @param message
 * @returns object - {statusCode: number, headers: object, body: string}
 */
module.exports.createErrorResponse = (statusCode, message) => {
    return {
        statusCode: statusCode || 500,
        headers: {
            'Access-Control-Allow-Origin' : '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'message': message}),
    };
};


/**
 * Parse the scopes from the event
 *
 * @param event
 * @returns {array}
 */
module.exports.getScopes = (event) => {
    const scope = (((event.requestContext || {}).authorizer || {}).scope || null);
    return scope ? scope.split(" ") : [];
};


/**
 * Check if a specified scope is within the scopes array
 *
 * @param scopes
 * @param scope
 * @returns boolean
 */
module.exports.scopesContainScope = (scopes, scope) => {
    return scopes.includes(scope);
};


/**
 * Get the authenticated user's id from the event
 * @param {{requestContext: {authorizer: {principalId: string}}}} event
 * @returns {string|null}
 */
module.exports.getAuthId = (event) => {
    const principalId = (((event.requestContext || {}).authorizer || {}).principalId || null);
    const auth = principalId ? principalId.split("|") : [];
    return auth.length === 2 ? auth[1] : null;
};


/**
 * Create an Asset
 * @param request
 * @returns {{name, mediaType: ECR.MediaType | * | mediaType | {type, required} | {type} | string}}
 */
module.exports.createAsset = (request) => {
    let asset = {
        name: request.name,
        mediaType: request.mediaType
    };

    if (request.uri) {
        asset.uri = request.uri;
    }

    if (request.text) {
        asset.text = request.text;
    }

    return asset;
};


/**********************
 * JSDoc stuff
 **********************/

/**
 * @callback requestCallback
 * @param {{number statusCode, string message}|HTTPError|null} err
 * @param {*} [response]
 */
