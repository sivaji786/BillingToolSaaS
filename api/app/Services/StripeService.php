<?php

namespace App\Services;

use Stripe\StripeClient;
use Exception;

class StripeService
{
    private $stripe;
    private $webhookSecret;

    public function __construct()
    {
        $apiKey = getenv('STRIPE_KEY');
        $this->webhookSecret = getenv('STRIPE_WEBHOOK_SECRET');

        if (!$apiKey) {
            // Log warning or throw exception depending on strictness
            log_message('critical', 'Stripe API Key missing in environment.');
        }

        $this->stripe = new StripeClient($apiKey);
    }

    /**
     * Create a Stripe Customer
     */
    public function createCustomer(string $email, string $name)
    {
        try {
            $customer = $this->stripe->customers->create([
                'email' => $email,
                'name' => $name,
            ]);
            return $customer;
        } catch (Exception $e) {
            log_message('error', 'Stripe Create Customer Failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create Checkout Session for Subscription Upgrade
     */
    public function createCheckoutSession(string $customerId, string $priceId, string $successUrl, string $cancelUrl)
    {
        try {
            $session = $this->stripe->checkout->sessions->create([
                'customer' => $customerId,
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1,
                ]],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ]);
            return $session->url;
        } catch (Exception $e) {
            log_message('error', 'Stripe Create Checkout Session Failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create Billing Portal Session
     */
    public function createPortalSession(string $customerId, string $returnUrl)
    {
        try {
            $session = $this->stripe->billingPortal->sessions->create([
                'customer' => $customerId,
                'return_url' => $returnUrl,
            ]);
            return $session->url;
        } catch (Exception $e) {
            log_message('error', 'Stripe Create Portal Session Failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Verify Webhook Signature and return Event
     */
    public function handleWebhook(string $payload, string $sigHeader)
    {
        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload, $sigHeader, $this->webhookSecret
            );
            return $event;
        } catch (Exception $e) {
            log_message('error', 'Stripe Webhook Verification Failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Retrieve a subscription
     */
    public function getSubscription(string $subscriptionId)
    {
        return $this->stripe->subscriptions->retrieve($subscriptionId);
    }
    
    /**
     * Retrieve a customer
     */
    public function getCustomer(string $customerId)
    {
        return $this->stripe->customers->retrieve($customerId);
    }
}
