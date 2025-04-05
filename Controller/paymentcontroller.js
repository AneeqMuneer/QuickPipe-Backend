const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Campaign = require("../Model/campaignModel");
const catchAsyncError = require("../Middleware/asyncError");

// ✅ Initialize Stripe payment
exports.createPaymentIntent = catchAsyncError(async (req, res, next) => {
  try {
    const { campaignId, amount, currency, metadata } = req.body;
    
    // Verify the campaign exists
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        message: "Campaign not found" 
      });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'usd',
      metadata: {
        campaignId,
        userId: req.user.id,
        ...metadata
      },
      // Optional: automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ✅ Handle Stripe webhook for payment confirmation
exports.stripeWebhook = catchAsyncError(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!');
      
      // Here you would update your database with the successful payment
      // For example:
      // await updateCampaignWithPayment(paymentIntent.metadata.campaignId, paymentIntent.amount);
      
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer!');
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

// ✅ Get payment details
exports.getPaymentDetails = catchAsyncError(async (req, res, next) => {
  try {
    const { paymentIntentId } = req.params;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    res.status(200).json({
      success: true,
      data: paymentIntent
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});