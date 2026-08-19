<?php
/* Admin only: roll content.json back to the most recent backup. */
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(array('error' => 'post_only'), 405);

$backups = DATA_DIR . '/backups';
$files = glob($backups . '/content-*.json');
if (!$files || !count($files)) json_out(array('error' => 'no_backup'), 404);

sort($files);
$latest = array_pop($files);

/* Snapshot what we are about to replace, so a rollback is itself reversible. */
if (file_exists(CONTENT_FILE)) {
  @copy(CONTENT_FILE, $backups . '/content-' . date('Ymd-His') . '-prerestore.json');
}

if (!@copy($latest, CONTENT_FILE)) json_out(array('error' => 'restore_failed'), 500);
json_out(array('ok' => true, 'restored' => basename($latest)));
