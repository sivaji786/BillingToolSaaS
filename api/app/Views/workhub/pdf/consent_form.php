<!DOCTYPE html>
<html lang="<?= esc($lang ?? 'en') ?>">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 20mm; }
  h1 { font-size: 16pt; color: #6d28d9; margin-bottom: 4mm; }
  h2 { font-size: 12pt; color: #4c1d95; margin: 5mm 0 2mm; }
  .header { display: flex; justify-content: space-between; margin-bottom: 8mm; }
  .logo { font-size: 20pt; font-weight: bold; color: #6d28d9; }
  .legal-block { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 2mm; padding: 4mm; margin: 3mm 0; font-size: 10pt; line-height: 1.7; }
  .data-table { width: 100%; margin-top: 3mm; }
  .data-table td { padding: 2mm 0; border-bottom: 1px solid #f0f0f0; font-size: 10pt; }
  .data-table td:first-child { color: #777; width: 45%; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 3mm; margin: 2mm 0; font-size: 10pt; }
  .checkbox-box { border: 1px solid #333; width: 5mm; height: 5mm; flex-shrink: 0; margin-top: 0.5mm; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 6mm; }
  .sign-block { border: 1px solid #aaa; height: 25mm; border-radius: 2mm; }
  .sign-img { max-width: 100%; max-height: 22mm; padding: 1mm; }
  .footer { margin-top: 10mm; border-top: 1px solid #ddd; padding-top: 3mm; font-size: 8pt; color: #888; text-align: center; }
  .article-ref { font-size: 9pt; color: #6b7280; font-style: italic; }
  .important { font-weight: bold; color: #166534; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo"><?= esc($tenant['company_name'] ?? 'WorkHub') ?></div>
    <div style="font-size:8pt;color:#777;margin-top:1mm;"><?= esc($tenant['address'] ?? '') ?></div>
  </div>
  <div style="text-align:right;font-size:9pt;color:#555;">
    <strong>GDPR CONSENT FORM</strong><br>
    Date: <?= date('d.m.Y') ?><br>
    Task: WO-<?= esc(str_pad($task['id'] ?? 0, 6, '0', STR_PAD_LEFT)) ?>
  </div>
</div>

<h1>Data Processing Consent — Field Service</h1>
<p class="article-ref">Pursuant to Art. 6(1)(b) GDPR — Processing necessary for the performance of a contract</p>

<h2>1. Data Controller</h2>
<p><?= esc($tenant['company_name'] ?? '—') ?>, <?= nl2br(esc($tenant['address'] ?? '')) ?></p>

<h2>2. Purpose of Data Processing</h2>
<div class="legal-block">
  Your personal data (name, signature, and contact details) are processed for the following purposes:
  <ul style="margin-left:5mm;margin-top:2mm;">
    <li>Documentation of the completion of field service task WO-<?= esc(str_pad($task['id'] ?? 0, 6, '0', STR_PAD_LEFT)) ?></li>
    <li>Generation of invoice and completion certificate for the services provided</li>
    <li>Compliance with legal record-keeping obligations (§257 HGB, §147 AO — 10-year retention)</li>
  </ul>
</div>

<h2>3. Data Collected</h2>
<table class="data-table">
  <tr><td>Full Name</td><td><?= esc($customer_name ?? '_______________________________') ?></td></tr>
  <tr><td>Signature</td><td>Electronic signature (eIDAS 910/2014 Simple Electronic Signature)</td></tr>
  <tr><td>IP Address</td><td>Recorded for eIDAS compliance purposes</td></tr>
  <tr><td>Date &amp; Time</td><td><?= date('d.m.Y H:i:s') ?></td></tr>
</table>

<h2>4. Your Rights (GDPR Art. 15–22)</h2>
<div class="legal-block">
  You have the right to: <strong>access</strong> (Art. 15), <strong>rectification</strong> (Art. 16), <strong>erasure</strong> (Art. 17, subject to legal retention obligations), <strong>restriction of processing</strong> (Art. 18), <strong>data portability</strong> (Art. 20), and the right to <strong>object</strong> (Art. 21).
  To exercise these rights, contact: <?= esc($tenant['email'] ?? $tenant['company_name'] ?? '—') ?>
</div>

<h2>5. Consent Declaration</h2>
<div style="margin-top:2mm;">
  <div class="checkbox-row">
    <div class="checkbox-box"><?= ($completion['gdpr_consent_given'] ?? false) ? '✓' : '' ?></div>
    <span>I consent to the processing of my personal data (name and electronic signature) for the purposes described above. I understand that my signature will be stored as evidence of service completion for the legally required retention period.</span>
  </div>
  <div class="checkbox-row">
    <div class="checkbox-box"><?= ($completion['gdpr_consent_given'] ?? false) ? '✓' : '' ?></div>
    <span>I confirm that the described field service has been completed to my satisfaction and authorise the issuance of an invoice based on this completion record.</span>
  </div>
</div>

<div class="sign-row">
  <div>
    <strong>Customer Signature</strong>
    <div class="sign-block">
      <?php if (!empty($completion['customer_signature_data'])): ?>
      <img class="sign-img" src="<?= esc($completion['customer_signature_data']) ?>" alt="Customer signature">
      <?php endif; ?>
    </div>
    <p style="font-size:9pt;color:#777;margin-top:1mm;">
      <?= esc($completion['customer_name'] ?? '______________________________') ?><br>
      <?= esc($completion['customer_signed_at'] ? date('d.m.Y H:i', strtotime($completion['customer_signed_at'])) : '________________') ?>
    </p>
  </div>
  <div>
    <strong>Service Provider</strong>
    <div class="sign-block"></div>
    <p style="font-size:9pt;color:#777;margin-top:1mm;">
      <?= esc($tenant['company_name'] ?? '') ?><br>________________
    </p>
  </div>
</div>

<div class="footer">
  <?= esc($tenant['company_name'] ?? 'WorkHub') ?> · GDPR Consent Form · <?= date('d.m.Y') ?> ·
  Consent text version: <?= esc($consent_text_version ?? '1.0') ?> ·
  Retained per §257 HGB / §147 AO.
</div>
</body>
</html>
