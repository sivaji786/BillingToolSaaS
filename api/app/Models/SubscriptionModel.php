<?php

namespace App\Models;

use App\Models\BaseModel;

class SubscriptionModel extends BaseModel
{
    protected $table            = 'subscriptions';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id', 'plan_id', 'stripe_subscription_id', 
        'status', 'current_period_start', 'current_period_end', 
        'cancel_at_period_end'
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
