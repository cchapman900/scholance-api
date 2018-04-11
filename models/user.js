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
        enum: ['student', 'business']
    },
    projects: [{
        type: Schema.Types.ObjectId,
        ref: 'Project'
    }]
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;