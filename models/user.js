const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Project = require('./project');
const Organization = require('./organization');
const validator = require('validator');

const portfolioEntrySchema = new Schema({
    project: {
        title: {
            type: String
        },
        organization: {
            type: Schema.Types.ObjectId,
            ref: 'Organization'
        },
        liaison: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        summary: {
            type: String
        }
    },
    submission: {
        assets: [{
            name: {
                type: String
            },
            mediaType: {
                type: String
            },
            uri: {
                type: String
            },
            text: {
                type: String
            }
        }],
        commentary: {
            type: String
        }
    },
    visible: {
        type: Boolean
    }
});

const model = mongoose.model('User', {
    name: {
        type: String
    },
    userType: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    photo: {
        type: String,
    },
    projects: [{
        type: Schema.Types.ObjectId,
        ref: 'Project'
    }],
    about: {
        type: String
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization'
    },
    position: {
        type: String
    },
    school: {
        type: String
    },
    academicFocus: {
        type: String
    },
    interests: {
        type: String
    },
    linkedin: {
        type: String
    },
    twitter: {
        type: String
    },
    instagram: {
        type: String
    },
    website: {
        type: String
    },
    portfolioEntries: [{
        type: portfolioEntrySchema
    }]
});

module.exports = model;
