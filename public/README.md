# Stripe Payment Integration Guide

This guide explains how to use the Stripe payment integration in your application.

## Setup

1. Make sure you have your Stripe API keys set up in the `config/config.env` file:

   ```
   STRIPE_PUBLISHABLE_KEY=your_publishable_key
   STRIPE_SECRET_KEY=your_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

2. Update the Stripe publishable key in the `public/js/payment.js` file:
   ```javascript
   const stripe = Stripe("your_publishable_key");
   ```

## Testing the Integration

1. Start your server:

   ```
   npm start
   ```

2. Visit the payment page:

   ```
   http://localhost:YOUR_PORT/payment
   ```

3. Enter an amount and use Stripe test card details:
   - Card number: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

## Setting Up Webhook (for Production)

For production, you need to set up a Stripe webhook to receive real-time payment events:

1. Log in to your Stripe Dashboard
2. Go to Developers > Webhooks
3. Add an endpoint with your server URL: `https://your-domain.com/EmailAccount/StripeWebhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the "Signing Secret" and add it to your `config.env` file as `STRIPE_WEBHOOK_SECRET`

For local testing, you can use the Stripe CLI to forward webhook events to your local server.

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
