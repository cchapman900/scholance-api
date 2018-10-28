const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');


const model = mongoose.model('Organization', {
    name: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        required: true,
    },
    industry: {
        type: String
    },
    twitter: {
        type: String
    },
    linkedin: {
        type: String
    },
    about: {
        type: String
    },
    logo: {
        type: String
    },
    liaisons: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
});

module.exports = model;
