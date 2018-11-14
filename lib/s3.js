const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fileType = require('file-type');


// TODO: Take this out of the util and put it in the service
const projectsBucket = process.env.S3_PROJECTS_BUCKET;

class S3Util {

    /**
     * This preps the folder for the asset files
     *
     * @param {string} bucket
     * @param {string} path
     * @param {S3Util~callback} callback
     */
    createFolder(bucket, path, callback) {
        s3.putObject(
            {
                Bucket: bucket,
                Key: path + '/'
            }, function(err) {
                if (err) {
                    console.error(err);
                    return callback(err);
                }
                callback(null);
            });
    }


    /**
     *
     * @param {string} bucket
     * @param {string} path
     * @param {{name: string, extension: string, contents: Buffer}} file
     * @param {S3Util~callback} callback
     */
    uploadFile(bucket, path, file, callback) {

        const fullFilePath = path + '/' + file.name.replace(' ', '+') + '.' + file.extension;

        let params = {
            Bucket: bucket,
            Key: fullFilePath,
            Body: file.contents
        };

        s3.putObject(params, function(err) {
            if (err) {
                console.error(err);
                return callback(err);
            }
            callback(null, 'https://s3.amazonaws.com/' + bucket + '/' + fullFilePath);
        });
    }
}

/**************
 * JSDoc stuff
 **************/

/**
 * @callback S3Util~callback
 * @param {{}|null} err
 * @param {{string}} response
 */


module.exports = S3Util;