const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fileType = require('file-type');

const projectsBucket = process.env.S3_PROJECTS_BUCKET;

class S3Util {

    /**
     * This preps the folder for the asset files
     *
     * @param {string} projectId
     * @param {S3Util~callback} callback
     */
    createProjectS3Bucket(projectId, callback) {
        s3.putObject(
            {
                Bucket: projectsBucket,
                Key: projectId + '/'
            }, function(err) {
                if (err) {
                    console.error(err);
                    callback(err);
                }
                else {
                    callback(null);
                }
            });
    }
}

/**************
 * JSDoc stuff
 **************/

/**
 * @callback S3Util~callback
 * @param {{}|null} err
 */


module.exports = S3Util;