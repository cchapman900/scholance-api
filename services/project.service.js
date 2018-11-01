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
     * @param showFullEntries
     * @param callback
     */
    get(projectId, showFullEntries, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            callback(err)
        });
        db.once('open', () => {
            let query = Project
                .findById(projectId)
                .populate({path: 'organization', select: 'name about'})
                .populate({path: 'liaison', select: 'name'})
                .populate({path: 'selectedEntry', select: 'name'})
                .populate({path: 'comments.author', select: 'name'});

            if (showFullEntries) {
                query
                    .populate({path: 'entries.student', select: 'name'})
            }

            query
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


    create(project, callback) {

        const db = this.dbService.connect();
        db.on('error', (err) => {
            callback(err)
        });
        db.once('open', () => {
            project
                .save()
                .then((project) => {
                    User.findByIdAndUpdate(authenticatedUserId, {$push: {'projects': project._id}}, {'upsert': true}).exec()  // TODO: Take upsert out of this. Doesn't seem safe
                })
                .then(() => {
                    s3.putObject(
                        {
                            Bucket: 'scholance-projects',
                            Key: project._id.toString() + '/'
                        }, function(err, data) {
                            if (err) {
                                console.log(err);
                                callback(null, createErrorResponse(503, 'There was an error creating the S3 bucket'));
                            }
                            else{
                                console.log(data);
                                callback(null, createSuccessResponse(201, project));
                            }
                            /*
                            data = {
                             Location: "http://examplebucket.s3.amazonaws.com/"
                            }
                            */
                        });
                })
                .catch((err) => {
                    callback(null, createErrorResponse(err.statusCode, err.message));
                })
                .finally(() => {
                    db.close();
                });
            });
        });
    };


    /*****************
     * METHOD TEMPLATE
     *****************/

    // template(callback) {
    //
    //     const db = this.dbService.connect();
    //     db.on('error', (err) => {
    //         callback(err)
    //     });
    //     db.once('open', () => {
    //         // Main body
    //     });
    // };


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