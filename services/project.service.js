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
     * @param queryStringParameters - An object of query string parameters. Valid query parameters are ['status']
     * @param callback
     */
    list(queryStringParameters = {}, callback) {

        // Get and validate the query string params (if set)
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

        // Set up the database
        const db = this.dbService.connect();
        db.on('error', (err) => {
            callback(err)
        });
        db.once('open', () => {

            // After all the above setup is complete, run the query and return the results
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
    }
}

module.exports = ProjectService;