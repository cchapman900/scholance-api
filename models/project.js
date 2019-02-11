const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');
const User = require('./user');
const Organization = require('./organization');


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

const rewardSchema = new Schema({
    amount: {
        type: Number
    },
    status: {
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
    }],
    selected: {
        type: Boolean
    },
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
    deadline: {
        type: Date,
    },
    fullDescription: {
        type: String,
    },
    category: {
        type: String,
    },
    deliverables: [{
        name: {
            type: String
        },
        mediaType: {
            type: String
        }
    }],
    specs: [{
        type: String
    }],
    supplementalResources: [{
       type: assetSchema
    }],
    entries: [{
        type: entrySchema
    }],
    selectedStudentId: {
        type: Schema.Types.ObjectId
    },
    reward: {
        type: rewardSchema
    },
    comments: [{
        type: messageSchema
    }],
    status: {
        type: String,
        required: true
    }
});

module.exports = projectModel;