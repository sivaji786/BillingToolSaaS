<!DOCTYPE html>
<html lang="<?= esc($lang ?? 'en') ?>">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 20mm; }
  h1 { font-size: 17pt; color: #6d28d9; margin-bottom: 4mm; }
  h2 { font-size: 12pt; color: #4c1d95; border-bottom: 1px solid #ddd6fe; margin: 6mm 0 3mm; padding-bottom: 1mm; }
  .header { display: flex; justify-content: space-between; margin-bottom: 8mm; }
  .logo { font-size: 20pt; font-weight: bold; color: #6d28d9; }
  .meta { text-align: right; font-size: 9pt; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
  th { background: #f3f0ff; color: #4c1d95; text-align: left; padding: 2mm 3mm; font-size: 10pt; }
  td { padding: 2mm 3mm; border-bottom: 1px solid #f0f0f0; font-size: 10pt; }
  .note-box { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 2mm; padding: 3mm; margin-top: 2mm; font-size: 10pt; line-height: 1.5; }
  .sig-block { border: 1px solid #aaa; border-radius: 2mm; padding: 2mm; text-align: center; min-height: 25mm; }
  .sig-img { max-width: 100%; max-height: 20mm; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 3mm; }
  .sig-meta { font-size: 8pt; color: #666; margin-top: 1mm; }
  .gdpr-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 2mm; padding: 3mm; margin-top: 3mm; font-size: 9pt; color: #166534; }
  .idas-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 2mm; padding: 3mm; margin-top: 2mm; font-size: 8pt; color: #1e3a8a; }
  .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 2mm; }
  .photo-cell img { width: 100%; border-radius: 1mm; }
  .total-row td { font-weight: bold; background: #f3f0ff; }
  .footer { margin-top: 10mm; border-top: 1px solid #ddd; padding-top: 3mm; font-size: 8pt; color: #888; text-align: center; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo"><?= esc($tenant['company_name'] ?? 'WorkHub') ?></div>
    <div style="font-size:9pt;color:#777;margin-top:1mm;"><?= esc($tenant['address'] ?? '') ?></div>
  </div>
  <div class="meta">
    <strong>COMPLETION CERTIFICATE</strong><br>
    No: CC-<?= esc(str_pad($completion['id'], 6, '0', STR_PAD_LEFT)) ?><br>
    Task: WO-<?= esc(str_pad($task['id'], 6, '0', STR_PAD_LEFT)) ?><br>
    Date: <?= date('d.m.Y') ?>
  </div>
</div>

<h1><?= esc($task['title'] ?? 'Completion Certificate') ?></h1>

<h2>Completion Details</h2>
<table>
  <tr><td width="35%"><strong>Location</strong></td><td><?= esc($task['location_tag'] ?? '—') ?></td></tr>
  <tr><td><strong>Project</strong></td><td><?= esc($task['project_name'] ?? '—') ?></td></tr>
  <tr><td><strong>Worker</strong></td><td><?= esc($worker['name'] ?? '—') ?></td></tr>
  <tr><td><strong>Time on Site</strong></td><td><?= esc(number_format(floatval($task['logged_hours'] ?? 0), 2)) ?> h</td></tr>
  <tr><td><strong>Completed At</strong></td><td><?= esc(date('d.m.Y H:i', strtotime($completion['worker_signed_at'] ?? 'now'))) ?></td></tr>
</table>

<h2>Completion Note</h2>
<div class="note-box"><?= nl2br(esc($completion['completion_note'] ?? '—')) ?></div>

<h2>Materials Used</h2>
<?php if (!empty($materials)): ?>
<table>
  <tr><th>Material</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr>
  <?php $total = 0; foreach ($materials as $m): $line = floatval($m['quantity']) * floatval($m['unit_price']); $total += $line; ?>
  <tr>
    <td><?= esc($m['material_name']) ?></td>
    <td><?= esc($m['quantity']) ?></td>
    <td><?= esc($m['unit']) ?></td>
    <td><?= number_format(floatval($m['unit_price']), 2) ?> €</td>
    <td><?= number_format($line, 2) ?> €</td>
  </tr>
  <?php endforeach; ?>
  <tr class="total-row"><td colspan="4">Materials Total</td><td><?= number_format($total, 2) ?> €</td></tr>
</table>
<?php else: ?>
<p style="color:#777;font-size:10pt;margin-top:2mm;">No materials recorded.</p>
<?php endif; ?>

<?php if (!empty($photos)): ?>
<h2>Site Photos</h2>
<div class="photos-grid">
  <?php foreach (array_slice($photos, 0, 6) as $photo): ?>
  <div class="photo-cell"><img src="<?= esc($photo['url']) ?>" alt="Site photo"></div>
  <?php endforeach; ?>
</div>
<?php endif; ?>

<h2>Signatures</h2>
<div class="sig-row">
  <div>
    <strong>Worker Signature</strong>
    <div class="sig-block">
      <?php if (!empty($completion['worker_signature_data'])): ?>
      <img class="sig-img" src="<?= esc($completion['worker_signature_data']) ?>" alt="Worker signature">
      <?php else: ?><em style="color:#aaa;font-size:9pt;">Not signed</em><?php endif; ?>
    </div>
    <div class="sig-meta">
      <?= esc($worker['name'] ?? '') ?><br>
      <?= esc($completion['worker_signed_at'] ? date('d.m.Y H:i', strtotime($completion['worker_signed_at'])) : '—') ?>
    </div>
  </div>
  <div>
    <strong>Customer Signature</strong>
    <div class="sig-block">
      <?php if (!empty($completion['customer_signature_data'])): ?>
      <img class="sig-img" src="<?= esc($completion['customer_signature_data']) ?>" alt="Customer signature">
      <?php else: ?><em style="color:#aaa;font-size:9pt;">Not signed</em><?php endif; ?>
    </div>
    <div class="sig-meta">
      <?= esc($completion['customer_name'] ?? '') ?><br>
      <?= esc($completion['customer_signed_at'] ? date('d.m.Y H:i', strtotime($completion['customer_signed_at'])) : '—') ?>
    </div>
  </div>
</div>

<div class="idas-box">
  <strong>Signature Evidence (eIDAS 910/2014 — Simple Electronic Signature)</strong><br>
  IP: <?= esc($completion['signed_ip'] ?? '—') ?> ·
  UA: <?= esc(substr($completion['signed_user_agent'] ?? '—', 0, 80)) ?> ·
  Consent version: <?= esc($completion['consent_text_version'] ?? '—') ?>
</div>

<div class="gdpr-box">
  ✓ GDPR Consent given by customer: <?= ($completion['gdpr_consent_given'] ?? false) ? 'Yes' : 'No' ?> ·
  Dual-signed: <?= ($completion['is_dual_signed'] ?? false) ? 'Yes' : 'No' ?> ·
  Retained for 10 years per §257 HGB / §147 AO
</div>

<div class="footer">
  Generated by <?= esc($tenant['company_name'] ?? 'WorkHub') ?> · <?= date('d.m.Y H:i') ?> ·
  This certificate constitutes proof of service completion. Retain for legal/audit purposes.
</div>
</body>
</html>
