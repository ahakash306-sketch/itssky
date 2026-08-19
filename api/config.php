<?php
/* Edit these two values, then upload. Nothing else in /api needs changing. */

/* 1. Your admin password. Generate a hash by visiting  /api/hash.php?p=yourpassword
      once, copying the result here, then DELETING hash.php from the server. */
define('ADMIN_HASH', '$2y$10$Q2Vs3Zk0J5m8bXwQO9pP4uY1lKQF8oq7hM0oV1wR6nD2tS5cZ8bGa');

/* 2. Where the JSON data lives. Keep this OUTSIDE public_html if you can —
      e.g. '/home/YOURUSER/portfolio-data'. If unsure, leave as is. */
define('DATA_DIR', __DIR__ . '/../data');

/* ---------- nothing below here needs editing ---------- */
define('CONTENT_FILE', DATA_DIR . '/content.json');
define('EVENTS_FILE',  DATA_DIR . '/events.json');
define('UPLOAD_DIR',   __DIR__ . '/../uploads');

session_start();

function ensure_dir($d) {
  if (!is_dir($d)) @mkdir($d, 0755, true);
}
function read_json($file, $fallback) {
  if (!file_exists($file)) return $fallback;
  $raw = @file_get_contents($file);
  if ($raw === false || $raw === '') return $fallback;
  $v = json_decode($raw, true);
  return $v === null ? $fallback : $v;
}
/* Atomic write: never leave a half-written file if the request dies mid-save. */
function write_json($file, $value) {
  ensure_dir(dirname($file));
  $tmp = $file . '.' . uniqid() . '.tmp';
  $ok = @file_put_contents($tmp, json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
  if ($ok === false) return false;
  return @rename($tmp, $file);
}
function is_admin() {
  return !empty($_SESSION['portfolio_admin']);
}
function require_admin() {
  if (!is_admin()) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(array('error' => 'not_authorised'));
    exit;
  }
}
function json_out($v, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  header('Cache-Control: no-store');
  echo json_encode($v);
  exit;
}
function body_json() {
  $raw = file_get_contents('php://input');
  $v = json_decode($raw, true);
  return is_array($v) ? $v : array();
}
