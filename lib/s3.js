const AWS = require('aws-sdk');
const s3 = new AWS.S3();

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
     * This preps the folder for the asset files
     *
     * @param {string} bucket
     * @param {string} path
     * @param {S3Util~callback} callback
     */
    deleteFolder(bucket, path, callback) {
        s3.deleteObject(
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
     * Upload a file
     *
     * @param {string} bucket
     * @param {string} path
     * @param {{name: string, extension: string, contents: Buffer}} file
     * @param {S3Util~callback} callback
     */
    uploadFile(bucket, path, file, callback) {

        const fullFilePath = path + '/' + file.name.replace(/ /g, '_') + '.' + file.extension;

        console.log(fullFilePath);

        let params = {
            ACL: 'public-read',
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


    /**
     * Delete a file
     *
     * @param {string} bucket
     * @param {string} uri
     * @param {S3Util~callback} callback
     */
    deleteFile(bucket, uri, callback) {

        const params = {
            Bucket: bucket,
            Key: uri
        };

        s3.deleteObject(params, (err) => {
            if (err) {
                console.error(err);
                return callback(err);
            }
            callback(null);
        });
    }
}

/**************
 * JSDoc stuff
 **************/

/**
 * @callback S3Util~callback
 * @param {{}|null} err
 * @param {string|null} [response]
 */


module.exports = S3Util;