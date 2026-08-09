<?php
/* Admin only: accept an image or video and drop it into /uploads. */
require __DIR__ . '/config.php';
require_admin();

if (empty($_FILES['file'])) json_out(array('error' => 'no_file'), 400);

$f = $_FILES['file'];
if ($f['error'] !== UPLOAD_ERR_OK) json_out(array('error' => 'upload_error', 'code' => $f['error']), 400);
if ($f['size'] > 60 * 1024 * 1024) json_out(array('error' => 'too_large'), 413);

$allowed = array(
  'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
  'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
  'mp4' => 'video/mp4', 'webm' => 'video/webm', 'mov' => 'video/quicktime'
);
$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
if (!isset($allowed[$ext])) json_out(array('error' => 'bad_type', 'ext' => $ext), 415);

/* Trust the sniffed type over the extension for anything but SVG. */
if ($ext !== 'svg' && function_exists('finfo_open')) {
  $fi = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($fi, $f['tmp_name']);
  finfo_close($fi);
  if (strpos($mime, 'image/') !== 0 && strpos($mime, 'video/') !== 0) json_out(array('error' => 'bad_content'), 415);
}

ensure_dir(UPLOAD_DIR);
$base = preg_replace('/[^a-zA-Z0-9._-]+/', '-', pathinfo($f['name'], PATHINFO_FILENAME));
$base = trim(substr($base, 0, 60), '-');
if ($base === '') $base = 'file';
$name = $base . '.' . $ext;
$i = 1;
while (file_exists(UPLOAD_DIR . '/' . $name)) { $name = $base . '-' . $i++ . '.' . $ext; }

if (!move_uploaded_file($f['tmp_name'], UPLOAD_DIR . '/' . $name)) json_out(array('error' => 'move_failed'), 500);
@chmod(UPLOAD_DIR . '/' . $name, 0644);

json_out(array('ok' => true, 'path' => 'uploads/' . rawurlencode($name), 'name' => $name));
