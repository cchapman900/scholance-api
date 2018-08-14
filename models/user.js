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
    }],
    completedProjects: [{
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
            }
        }
    }]
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;