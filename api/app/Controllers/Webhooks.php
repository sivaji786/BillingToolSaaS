<?php

namespace App\Controllers;

use App\Services\StripeService;
use App\Models\TenantModel;
use App\Models\SubscriptionModel;
use App\Models\PaymentModel;
use CodeIgniter\API\ResponseTrait;

class Webhooks extends BaseController
{
    use ResponseTrait;

    protected $stripe;

    public function __construct()
    {
        $this->stripe = new StripeService();
    }

    public function stripe()
    {
        $payload = @file_get_contents('php://input');
        $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

        try {
            $event = $this->stripe->handleWebhook($payload, $sigHeader);
        } catch (\Exception $e) {
            return $this->fail('Webhook Error: ' . $e->getMessage(), 400);
        }

        // Handle the event
        switch ($event->type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                $this->handleSubscriptionUpdate($event->data->object);
                break;
            case 'invoice.payment_succeeded':
                $this->handlePaymentSucceeded($event->data->object);
                break;
            case 'invoice.payment_failed':
                $this->handlePaymentFailed($event->data->object);
                break;
            default:
                // Unexpected event type
                // log_message('info', 'Received unknown event type ' . $event->type);
        }

        return $this->respond(['status' => 'success']);
    }

    private function handleSubscriptionUpdate($subscription)
    {
        $stripeCustomerId = $subscription->customer;
        $tenantModel = new TenantModel();
        
        // Find tenant by stripe_customer_id
        $tenant = $tenantModel->where('stripe_customer_id', $stripeCustomerId)->first();
        
        if (!$tenant) {
            log_message('error', 'Webhook: Tenant not found for customer ' . $stripeCustomerId);
            return;
        }

        $subscriptionModel = new SubscriptionModel();
        
        // Map Stripe Status to App Status
        $status = $subscription->status; // active, past_due, canceled, trialing
        
        // Determine Plan ID from Price ID (This requires a mapping or lookup)
        // For MVP, simplistic mapping or lookup via metadata
        $planId = $this->getPlanIdFromPriceId($subscription->items->data[0]->price->id);
        
        $data = [
            'stripe_subscription_id' => $subscription->id,
            'plan_id' => $planId,
            'status' => $status,
            'current_period_start' => date('Y-m-d H:i:s', $subscription->current_period_start),
            'current_period_end' => date('Y-m-d H:i:s', $subscription->current_period_end),
            'cancel_at_period_end' => $subscription->cancel_at_period_end ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // Check if subscription exists
        $existing = $subscriptionModel->where('tenant_id', $tenant['id'])->first();
        
        if ($existing) {
            $subscriptionModel->update($existing['id'], $data);
        } else {
            $data['tenant_id'] = $tenant['id'];
            $subscriptionModel->insert($data);
        }
    }

    private function handlePaymentSucceeded($invoice)
    {
        // Log payment success, maybe create an Invoice record in a 'billing_invoices' table
        // For now, just logging
        log_message('info', 'Payment succeeded for invoice: ' . $invoice->id);
    }

    private function handlePaymentFailed($invoice)
    {
        log_message('error', 'Payment failed for invoice: ' . $invoice->id);
    }
    
    private function getPlanIdFromPriceId($priceId)
    {
        // Hardcoded mapping for now, or fetch from Plans table where stripe_price_id matches
        // Ideally Plans table should have stripe_price_id
        // For now assuming:
        // 'price_starter_monthly' => 1
        // 'price_pro_monthly' => 2
        // Since we don't have price IDs in Plans table yet, we might need to add that.
        // Or we use metadata on the price in Stripe to store 'plan_id'.
        
        // Safe default:
        return 1; 
    }
}
