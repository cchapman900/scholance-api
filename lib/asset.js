const fileType = require('file-type');

class AssetService {


    /**
     * Create an Asset from JSON
     * @param request
     * @returns {{name, mediaType: ECR.MediaType | * | mediaType | {type, required} | {type} | string}}
     */
     createAssetFromRequest(request) {

         let asset = {
            name: request.name,
            mediaType: request.mediaType
         };

         if (!asset.name || !asset.mediaType) {
             console.error('invalid asset input: ' + request);
             throw new Error('invalid asset input')
         }

         // TODO: If it is a link, add "http" if needed
         if (request.uri) {
            asset.uri = request.uri;
         }

         if (request.text) {
            asset.text = request.text;
         }

         return asset;
    };


    /**
     * Gets a file from an HTTP request with image upload
     *
     * @param {{name: string, file: string}} request
     * @returns {{name: string, mediaType: string, extension: string, contents: Buffer}}
     */
    getFileFromRequest(request) {

        // Get the data from the request
        const name = request.name;
        const file = request.file;

        if (!name || !file) {
            throw new Error('Invalid input');
        }

        // Parse the file data and get it into a buffer
        // TODO: Abstract this to non-image files
        const  base64String = file.replace('data:image/png;base64,', '');
        if (!base64String) {
            throw new Error('Invalid file data');
        }
        const buffer = new Buffer(base64String, 'base64');

        // Determine the file type (text, image, video, etc)
        const fileMime = fileType(buffer);
        if (fileMime === null) {
            throw new Error('The string supplied is not a file type');
        }
        const mediaType = fileMime.mime.split('/')[0];

        // Get the file extension (.jpg, .png, etc)
        const fileExt = fileMime.ext;

        return {
            name: name,
            mediaType: mediaType,
            extension: fileExt,
            contents: buffer
        };
    }
}


module.exports = AssetService;
