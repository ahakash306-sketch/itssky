<?php
/* Public: the site fetches this on every load to get the current content. */
require __DIR__ . '/config.php';
header('Content-Type: application/json');
header('Cache-Control: no-store, max-age=0');
$content = read_json(CONTENT_FILE, new stdClass());
echo json_encode(array('ok' => true, 'content' => $content, 'admin' => is_admin()));
