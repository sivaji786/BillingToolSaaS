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
  th { background: #6d28d9; color: #fff; padding: 2mm 2.5mm; text-align: center; }
  th.left { text-align: left; }
  td { padding: 1.5mm 2.5mm; border-bottom: 1px solid #ede9fe; text-align: center; }
  td.left { text-align: left; }
  tr:nth-child(even) td { background: #faf5ff; }
  .total-row td { font-weight: bold; background: #ede9fe !important; }
  .ot-flag { color: #dc2626; font-weight: bold; }
  .legal-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 2mm; padding: 3mm; margin-top: 4mm; font-size: 8.5pt; color: #78350f; line-height: 1.5; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 6mm; }
  .sign-block { border: 1px solid #aaa; height: 20mm; border-radius: 2mm; margin-top: 1mm; }
  .footer { margin-top: 8mm; border-top: 1px solid #ddd; padding-top: 2mm; font-size: 7.5pt; color: #888; text-align: center; }
  .week-header { background: #ede9fe; font-weight: bold; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 3mm; }
  .summary-card { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 2mm; padding: 3mm; text-align: center; }
  .summary-card .val { font-size: 14pt; font-weight: bold; color: #6d28d9; }
  .summary-card .lbl { font-size: 8pt; color: #777; margin-top: 0.5mm; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo"><?= esc($tenant['company_name'] ?? 'WorkHub') ?></div>
    <div style="font-size:8pt;color:#777;margin-top:1mm;"><?= esc($tenant['address'] ?? '') ?></div>
  </div>
  <div class="meta">
    <strong>TIMESHEET</strong><br>
    Worker: <strong><?= esc($worker['name'] ?? '—') ?></strong><br>
    Period: <?= esc($period_label ?? date('Y-m')) ?><br>
    Generated: <?= date('d.m.Y') ?>
  </div>
</div>

<h1>Timesheet — <?= esc($worker['name'] ?? '') ?></h1>

<div class="summary-grid">
  <div class="summary-card">
    <div class="val"><?= esc(number_format(floatval($totals['total_work_hours'] ?? 0), 1)) ?>h</div>
    <div class="lbl">Total Work</div>
  </div>
  <div class="summary-card">
    <div class="val"><?= esc(number_format(floatval($totals['total_break_hours'] ?? 0), 1)) ?>h</div>
    <div class="lbl">Total Break</div>
  </div>
  <div class="summary-card">
    <div class="val"><?= esc($totals['days_worked'] ?? 0) ?></div>
    <div class="lbl">Days Worked</div>
  </div>
  <div class="summary-card">
    <div class="val"><?= esc($totals['overtime_days'] ?? 0) ?></div>
    <div class="lbl">Overtime Days</div>
  </div>
</div>

<h2>Daily Breakdown</h2>
<table>
  <tr>
    <th class="left">Date</th>
    <th class="left">Task</th>
    <th>Work (h)</th>
    <th>Break (h)</th>
    <th>Net (h)</th>
    <th>Status</th>
  </tr>
  <?php
  $runningTotal = 0;
  foreach (($entries ?? []) as $entry):
      $net = floatval($entry['net_hours'] ?? 0);
      $runningTotal += $net;
      $isOvertime = $net > 8;
  ?>
  <tr>
    <td class="left"><?= esc(date('D, d.m', strtotime($entry['date'] ?? 'now'))) ?></td>
    <td class="left"><?= esc($entry['task_title'] ?? '—') ?></td>
    <td><?= number_format(floatval($entry['work_hours'] ?? 0), 2) ?></td>
    <td><?= number_format(floatval($entry['break_hours'] ?? 0), 2) ?></td>
    <td <?= $isOvertime ? 'class="ot-flag"' : '' ?>><?= number_format($net, 2) ?><?= $isOvertime ? ' ⚠' : '' ?></td>
    <td><?= esc($entry['arbzg_status'] ?? 'OK') ?></td>
  </tr>
  <?php endforeach; ?>
  <tr class="total-row">
    <td class="left" colspan="4">Total</td>
    <td><?= number_format($runningTotal, 2) ?></td>
    <td></td>
  </tr>
</table>

<div class="legal-box">
  <strong>§16 ArbZG / EuGH C-55/18 Compliance Note:</strong> This timesheet records all work and break times in accordance with the German Working Hours Act (ArbZG). Daily working time must not exceed 8 hours without compensatory rest. Breaks ≥30 min are required after 6h, ≥45 min after 9h. ⚠ flags indicate days where limits may have been approached. This record is retained for 2 years per §16 ArbZG.
</div>

<div class="sign-row">
  <div>
    <strong>Worker Sign-off</strong>
    <div class="sign-block"></div>
    <div style="font-size:8pt;color:#777;margin-top:1mm;"><?= esc($worker['name'] ?? '') ?> — Date: _____________</div>
  </div>
  <div>
    <strong>Manager Approval</strong>
    <div class="sign-block"></div>
    <div style="font-size:8pt;color:#777;margin-top:1mm;">Name: _________________ — Date: _____________</div>
  </div>
</div>

<div class="footer">
  <?= esc($tenant['company_name'] ?? 'WorkHub') ?> · Timesheet · <?= date('d.m.Y H:i') ?> ·
  Retained 2 years per §16 ArbZG; billable records retained 10 years per §257 HGB / §147 AO.
</div>
</body>
</html>
