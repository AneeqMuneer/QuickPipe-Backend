document.addEventListener('DOMContentLoaded', function () {
    // Initialize Stripe
    // Note: In production, you should replace this with your actual publishable key
    const stripe = Stripe('pk_test_51RUlirFYxVVbdtFSBryjfLzYPCE2K0w758wXvx2gSmThmB8XR9wkliFHVluvYLCZTZltdMrx8uXRixHQuxfOwDvV005PUzCvDf');
    const elements = stripe.elements();

    // Create card element
    const cardElement = elements.create('card');
    cardElement.mount('#card-element');

    // Handle form submission
    const form = document.getElementById('payment-form');
    const submitButton = document.getElementById('submit-button');
    const paymentStatus = document.getElementById('payment-status');

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        // Get amount
        const amountInput = document.getElementById('amount');
        const amount = parseFloat(amountInput.value);

        if (!amount || amount <= 0) {
            showMessage('Please enter a valid amount', 'error');
            return;
        }

        // Disable button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        try {
            // Create payment intent on the server
            const response = await fetch('/EmailAccount/CreatePaymentIntent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    Amount: 30,
                    Domains: [
                        { "name": "example1.com", "price": 10 },
                        { "name": "example2.com", "price": 10 },
                        { "name": "example3.com", "price": 6 },
                        { "name": "example4.com", "price": 4 }
                    ]
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create payment intent');
            }

            const { clientSecret } = await response.json();

            console.log(clientSecret);

            // Confirm card payment
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        // You can collect these details from the user if needed
                        name: 'Customer Name',
                    },
                },
            });

            if (result.error) {
                // Show error to customer
                showMessage(result.error.message, 'error');
            } else {
                // Payment succeeded
                if (result.paymentIntent.status === 'succeeded') {
                    showMessage('Payment successful! Thank you for your purchase.', 'success');
                    form.reset();
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Pay Now';
        }
    });

    // Helper function to show messages
    function showMessage(message, type) {
        paymentStatus.textContent = message;
        paymentStatus.className = type;
        paymentStatus.style.display = 'block';

        // Scroll to the message
        paymentStatus.scrollIntoView({ behavior: 'smooth' });

        // Hide the message after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                paymentStatus.style.display = 'none';
            }, 5000);
        }
    }

    // Handle real-time validation errors
    cardElement.addEventListener('change', function (event) {
        if (event.error) {
            showMessage(event.error.message, 'error');
        } else {
            paymentStatus.style.display = 'none';
        }
    });
}); 