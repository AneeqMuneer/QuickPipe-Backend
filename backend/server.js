require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create payment intent

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure integer value
      currency: 'usd',
      payment_method_types: ['card']
    });

    console.log('Created PaymentIntent:', paymentIntent.id);
    res.json({ clientSecret: paymentIntent.client_secret });
    
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment intent' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));