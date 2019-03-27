const stripe = require("stripe")("sk_test_DMKCFlYzGpaH04yDHRIs3YsP");

class PaymentService {

    /**
     * @returns {}
     */
    async charge(amount, token) {
        const result = await stripe.charges.create({
            amount: amount,
            currency: 'usd',
            description: 'Example charge',
            source: token,
        });
        console.log(result);
        return result;
    }
}


module.exports = PaymentService;
