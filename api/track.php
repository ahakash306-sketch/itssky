<?php
/* Public: the site posts visitor events here. Kept deliberately cheap —
   append-only, capped, no cookies, no third party. */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(array('error' => 'post_only'), 405);

$body = body_json();
$events = isset($body['events']) && is_array($body['events']) ? $body['events'] : array();
if (!count($events)) json_out(array('ok' => true, 'stored' => 0));

$all = read_json(EVENTS_FILE, array());
if (!is_array($all)) $all = array();

$now = round(microtime(true) * 1000);
$ref = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
/* A rotating daily hash — lets us count unique visitors without storing an IP. */
$vid = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ($_SERVER['HTTP_USER_AGENT'] ?? '') . date('Y-m-d')), 0, 12);

$added = 0;
foreach (array_slice($events, 0, 40) as $e) {
  if (!is_array($e) || !isset($e['type'])) continue;
  $all[] = array(
    't'     => isset($e['t']) ? (int)$e['t'] : $now,
    'type'  => substr((string)$e['type'], 0, 24),
    'label' => isset($e['label']) ? substr((string)$e['label'], 0, 120) : '',
    'ms'    => isset($e['ms']) ? (int)$e['ms'] : null,
    'v'     => $vid,
    'ref'   => substr($ref, 0, 160)
  );
  $added++;
}

/* Keep the file small enough to read quickly on shared hosting. */
if (count($all) > 20000) $all = array_slice($all, -20000);

write_json(EVENTS_FILE, $all);
json_out(array('ok' => true, 'stored' => $added));
