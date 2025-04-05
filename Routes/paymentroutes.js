const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentcontroller');
const { isAuthenticated } = require('../Middleware/auth');

// Create payment intent
router.post('/create-payment-intent', isAuthenticated, paymentController.createPaymentIntent);

// Stripe webhook (needs raw body)
router.post('/webhook', express.raw({type: 'application/json'}), paymentController.stripeWebhook);

// Get payment details
router.get('/:paymentIntentId', isAuthenticated, paymentController.getPaymentDetails);

module.exports = router;