const Project = require('../models/project.js');

class ProjectService {

    /**
     * @param dbService
     */
    constructor (dbService) {
        this.dbService = dbService;
    }


    /**
     * LIST PROJECT
     * Get a list of projects with the specified query
     *
     * @param queryStringParameters - An object of query string parameters.
     * @param callback
     */
    list(queryStringParameters = {}, callback) {

        // Get and validate the query string params (if set)
        const query = this.getValidListProjectsQueryParams(queryStringParameters);

        const db = this.dbService.connect();
        db.on('error', (err) => {
            callback(err)
        });
        db.once('open', () => {
            Project
                .find(query)
                .populate({path: 'organization', select: 'name'})
                .then((projects) => {
                    callback(null, projects);
                })
                .finally(() => {
                    db.close();
                })
        });
    };


    /**
     * GET PROJECT BY ID
     * Get a single project with the specified id
     *
     * @param projectId - A project's ObjectId.
     * @param callback
     */
    get(projectId, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            callback(err)
        });
        db.once('open', () => {
            Project
                .findById(projectId)
                // TODO: Might be a good idea to limit population based on scopes
                .populate({path: 'entries.student', select: 'name'})
                .populate({path: 'organization', select: 'name about'})
                .populate({path: 'liaison', select: 'name'})
                .populate({path: 'selectedEntry', select: 'name'})
                .populate({path: 'comments.author', select: 'name'})
                .then((project) => {
                    if (!project) {
                        callback({statusCode: 404, message: 'Project not found'});
                    } else {
                        callback(null, project);
                    }
                })
                .catch((err) => {
                    callback(err);
                })
                .finally(() => {
                    db.close();
                });
        });
    };


    /************************
     * HELPER METHODS
     ************************/


    /**
     * @param queryStringParameters
     * @returns {{}}
     */
    getValidListProjectsQueryParams(queryStringParameters) {
        const validQueryParams = ['status'];
        let query = {};
        if (queryStringParameters) {
            query = Object.keys(queryStringParameters)
                .filter(key => validQueryParams.includes(key))
                .reduce((obj, key) => {
                    obj[key] = queryStringParameters[key];
                    return obj;
                }, {});
        }
        return query;
    };
}

module.exports = ProjectService;