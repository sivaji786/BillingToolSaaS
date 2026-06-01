<!DOCTYPE html>
<html lang="<?= esc($lang ?? 'en') ?>">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; padding: 15mm 20mm; }
  h1 { font-size: 16pt; color: #6d28d9; margin-bottom: 2mm; }
  h2 { font-size: 11pt; color: #4c1d95; border-bottom: 1px solid #ddd6fe; margin: 5mm 0 2mm; padding-bottom: 1mm; }
  .header { display: flex; justify-content: space-between; margin-bottom: 6mm; }
  .logo { font-size: 18pt; font-weight: bold; color: #6d28d9; }
  .meta { text-align: right; font-size: 9pt; color: #555; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #6d28d9; color: #fff; padding: 2mm 2.5mm; text-align: left; }
  td { padding: 1.5mm 2.5mm; border-bottom: 1px solid #ede9fe; }
  tr:nth-child(even) td { background: #faf5ff; }
  .progress-bar-wrap { background: #e5e7eb; border-radius: 2mm; height: 3mm; width: 100%; }
  .progress-bar-fill { height: 3mm; border-radius: 2mm; background: #6d28d9; }
  .badge { display: inline-block; padding: 0.5mm 2mm; border-radius: 2mm; font-size: 8pt; }
  .badge-open       { background: #dbeafe; color: #1d4ed8; }
  .badge-in_progress { background: #fef9c3; color: #854d0e; }
  .badge-done       { background: #dcfce7; color: #166534; }
  .badge-problem    { background: #fee2e2; color: #991b1b; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 3mm; }
  .stat-card { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 2mm; padding: 3mm; text-align: center; }
  .stat-card .val { font-size: 14pt; font-weight: bold; color: #6d28d9; }
  .stat-card .lbl { font-size: 8pt; color: #777; margin-top: 0.5mm; }
  .footer { margin-top: 8mm; border-top: 1px solid #ddd; padding-top: 2mm; font-size: 7.5pt; color: #888; text-align: center; }
  .colour-dot { display: inline-block; width: 4mm; height: 4mm; border-radius: 50%; vertical-align: middle; margin-right: 1mm; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo"><?= esc($tenant['company_name'] ?? 'WorkHub') ?></div>
  </div>
  <div class="meta">
    <strong>PROJECT STATUS REPORT</strong><br>
    Generated: <?= date('d.m.Y H:i') ?>
  </div>
</div>

<h1><?= esc($project['name'] ?? 'Project Status') ?>
  <?php if (!empty($project['colour_accent'])): ?>
  <span class="colour-dot" style="background:<?= esc($project['colour_accent']) ?>;"></span>
  <?php endif; ?>
</h1>

<?php if (!empty($project['customer_name'])): ?>
<p style="color:#555;margin-bottom:2mm;">Customer: <strong><?= esc($project['customer_name']) ?></strong></p>
<?php endif; ?>

<div class="stat-grid">
  <div class="stat-card">
    <div class="val"><?= esc($stats['total'] ?? 0) ?></div>
    <div class="lbl">Total Tasks</div>
  </div>
  <div class="stat-card">
    <div class="val"><?= esc($stats['done'] ?? 0) ?></div>
    <div class="lbl">Completed</div>
  </div>
  <div class="stat-card">
    <div class="val"><?= esc($stats['in_progress'] ?? 0) ?></div>
    <div class="lbl">In Progress</div>
  </div>
  <div class="stat-card">
    <div class="val"><?= esc($stats['problem'] ?? 0) ?></div>
    <div class="lbl">Problems</div>
  </div>
</div>

<h2>Overall Progress</h2>
<?php $pct = intval($stats['progress_pct'] ?? 0); ?>
<div style="margin: 2mm 0;">
  <div class="progress-bar-wrap">
    <div class="progress-bar-fill" style="width: <?= min($pct, 100) ?>%;"></div>
  </div>
  <p style="font-size:9pt;color:#555;margin-top:1mm;"><?= $pct ?>% complete</p>
</div>

<h2>Task Overview</h2>
<table>
  <tr>
    <th>Task</th><th>Worker</th><th>Priority</th><th>Status</th><th>Est. h</th><th>Logged h</th>
  </tr>
  <?php foreach (($tasks ?? []) as $task): ?>
  <tr>
    <td><?= esc($task['title']) ?></td>
    <td><?= esc($task['worker_name'] ?? '—') ?></td>
    <td><?= ucfirst(esc($task['priority'] ?? '—')) ?></td>
    <td><span class="badge badge-<?= esc($task['status']) ?>"><?= ucfirst(str_replace('_', ' ', $task['status'])) ?></span></td>
    <td><?= esc($task['est_hours'] ?? '—') ?></td>
    <td><?= esc(number_format(floatval($task['logged_hours'] ?? 0), 2)) ?></td>
  </tr>
  <?php endforeach; ?>
</table>

<div class="footer">
  <?= esc($tenant['company_name'] ?? 'WorkHub') ?> · Project Status Report · <?= date('d.m.Y H:i') ?> · Confidential
</div>
</body>
</html>
