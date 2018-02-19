const mongoose = require('mongoose');
const validator = require('validator');


const model = mongoose.model('Project', {
    title: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        required: true,
    },
    fullDescription: {
        type: String,
    },
    category: {
        type: String,
    },
});

module.exports = model;