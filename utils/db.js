const mongoose = require('mongoose');
const bluebird = require('bluebird');

mongoose.Promise = bluebird;

const mongoString = process.env.MONGO_URI;
const mongooseOptions = {
    server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }
};

class DBService {

    static connect() {
        mongoose.connect(mongoString, mongooseOptions);
        return mongoose.connection
    }
}


module.exports = DBService;
