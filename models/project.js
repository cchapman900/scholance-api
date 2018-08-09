const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');


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
        type: String,
        required: true
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
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    fullDescription: {
        type: String,
    },
    category: {
        type: String,
    },
    deliverables: {
        name: {
            type: String
        },
        type: {
            type: String
        }
    },
    specs: [{
        type: String
    }],
    supplementalResources: [{
       type: assetSchema
    }],
    entries: [{
        type: entrySchema
    }],
    comments: [{
        type: messageSchema
    }],
    status: {
        type: String,
        required: true
    },
    selectedEntry: {
        type: String
    }
});

module.exports = projectModel;