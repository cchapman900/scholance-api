const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');


const organizationSchema = new Schema({
    name: {
        type: String,
        required: true
    }
});

const messageSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String
    }
});

const assetSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        required: true
    },
    uri: {
        type: String
    },
    text: {
        type: String
    }
});

const entrySchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    commentary: {
        type: String
    },
    assets: [{
        type: assetSchema
    }],
    submissionStatus: {
        type: String
    },
    comments: [{
        type: messageSchema
    }]
});


const projectModel = mongoose.model('Project', {
    title: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        required: true,
    },
    liaison: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: organizationSchema,
        required: true
    },
    fullDescription: {
        type: String,
    },
    category: {
        type: String,
    },
    supplementalResources: [{
       type: assetSchema
    }],
    entries: [{
        type: entrySchema
    }],
    comments: [{
        type: messageSchema
    }]
});

module.exports = projectModel;