const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');

<<<<<<< HEAD
=======
const portfolioEntrySchema = new Schema({
    project: {
        title: {
            type: String
        },
        organization: {
            type: Schema.Types.ObjectId,
            ref: 'Organization'
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
        },
        selected: {
            type: Boolean
        }
    },
    visible: {
        type: Boolean
    }
});

>>>>>>> Authentication
const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    userType: {
        type: String,
<<<<<<< HEAD
        required: true,
        enum: ['student', 'business']
    }
=======
        enum: ['student', 'business']
    },
    projects: [{
        type: Schema.Types.ObjectId,
        ref: 'Project'
    }],
    portfolioEntries: [{
        type: portfolioEntrySchema
    }]
>>>>>>> Authentication
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;