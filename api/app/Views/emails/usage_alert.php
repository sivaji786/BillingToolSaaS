<!DOCTYPE html>
<html>
<head>
    <style>
        .container { font-family: sans-serif; padding: 20px; color: #333; }
        .header { color: #7c3aed; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .button { 
            display: inline-block; 
            background: #7c3aed; 
            color: #fff !important; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px; 
        }
        .footer { margin-top: 40px; font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Usage Alert for <?= $tenantName ?></div>
        <div class="content">
            <p>Hello,</p>
            <p>This is an automated notification regarding your usage on <strong><?= base_url() ?></strong>.</p>
            <p>You have reached <strong><?= $threshold ?>%</strong> of your <strong><?= $resourceType ?></strong> limit for the current billing period starting on <?= $periodStart ?>.</p>
            
            <p>To avoid any service interruption or to increase your limits, please consider upgrading your plan.</p>
            
            <a href="<?= $upgradeUrl ?>" class="button">Upgrade Plan</a>
        </div>
        <div class="footer">
            &copy; <?= date('Y') ?> <?= $tenantName ?>. Sent from BillingTool.
        </div>
    </div>
</body>
</html>
