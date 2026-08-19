<?php
/* Admin only: overwrite the published content, keeping the last 20 versions. */
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(array('error' => 'post_only'), 405);

$body = body_json();
if (!isset($body['content'])) json_out(array('error' => 'no_content'), 400);

/* Snapshot the current file before replacing it, so a bad save is recoverable. */
if (file_exists(CONTENT_FILE)) {
  $backups = DATA_DIR . '/backups';
  ensure_dir($backups);
  @copy(CONTENT_FILE, $backups . '/content-' . date('Ymd-His') . '.json');
  $old = glob($backups . '/content-*.json');
  if ($old && count($old) > 20) {
    sort($old);
    foreach (array_slice($old, 0, count($old) - 20) as $f) @unlink($f);
  }
}

if (!write_json(CONTENT_FILE, $body['content'])) json_out(array('error' => 'write_failed'), 500);
json_out(array('ok' => true, 'saved' => date('c')));
