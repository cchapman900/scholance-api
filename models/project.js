const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true,
        enum: ['student', 'business']
    }
});

const organizationSchema = new Schema({
    name: {
        type: String,
        required: true
    }
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
        type: userSchema,
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
});

module.exports = projectModel;