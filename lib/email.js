const AWS = require('aws-sdk');
const ses = new AWS.SES({apiVersion: '2010-12-01'});

senderAddress = 'notifications@scholance.com';

class EmailUtil {

    /**
     * Send email
     *
     * @param {string} toAddress
     * @param {string} subject
     * @param {string} body
     * @returns {Promise<PromiseResult<SES.SendEmailResponse, AWSError>>}
     */
    static sendEmail(toAddress, subject, body) {

        // Create sendEmail params
        const params = {
            Destination: {
                ToAddresses: [toAddress]
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: body
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: body
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: subject
                }
            },
            Source: senderAddress
        };

        console.log(params);

        return ses.sendEmail(params).promise();
    }
}

/**************
 * JSDoc stuff
 **************/

/**
 * @callback S3Util~callback
 * @param {{}|null} err
 * @param {string|null} [response]
 */


module.exports = EmailUtil;