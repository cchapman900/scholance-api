const User = require('../models/user');

class UserService {

    /**
     * Constructor
     *
     * @param dbService
     */
    constructor(dbService) {
        this.dbService = dbService;
    }


    /*****************
     * FUNCTION TEMPLATE
     *****************/

    // template(callback) {
    //
    //     const db = this.dbService.connect();
    //     db.on('error', (err) => {
    //         callback(err)
    //     });
    //     db.once('open', () => {
    //         // Main body
    //     });
    // };


    /************************
     * HELPER METHODS
     ************************/


}

module.exports = UserService;