<?php
/* Admin only: aggregate the raw event log into the dashboard's shape. */
require __DIR__ . '/config.php';
require_admin();

if (isset($_GET['clear'])) {
  write_json(EVENTS_FILE, array());
  json_out(array('ok' => true, 'cleared' => true));
}

$all = read_json(EVENTS_FILE, array());
if (!is_array($all)) $all = array();

$days = (int)(isset($_GET['days']) ? $_GET['days'] : 14);
if ($days < 1 || $days > 90) $days = 14;

$visitors = array(); $sessions = 0; $caseOpens = 0; $ctas = 0; $depth = 0;
$byCase = array(); $refs = array(); $videos = array(); $dwell = array();
$series = array();
for ($i = $days - 1; $i >= 0; $i--) {
  $k = date('Y-m-d', strtotime("-$i day"));
  $series[$k] = array('key' => $k, 'label' => (int)date('j', strtotime("-$i day")), 'n' => 0);
}

foreach ($all as $e) {
  $type = isset($e['type']) ? $e['type'] : '';
  $label = isset($e['label']) ? $e['label'] : '';
  if (!empty($e['v'])) $visitors[$e['v']] = 1;

  if ($type === 'session') {
    $sessions++;
    $host = '';
    if (!empty($e['ref'])) {
      $h = parse_url($e['ref'], PHP_URL_HOST);
      if ($h) $host = preg_replace('/^www\./', '', $h);
    }
    if ($host === '' || strpos($host, $_SERVER['HTTP_HOST']) !== false) $host = 'direct';
    $refs[$host] = (isset($refs[$host]) ? $refs[$host] : 0) + 1;
    $k = date('Y-m-d', (int)($e['t'] / 1000));
    if (isset($series[$k])) $series[$k]['n']++;
  }
  if ($type === 'case_open') { $caseOpens++; $byCase[$label] = (isset($byCase[$label]) ? $byCase[$label] : 0) + 1; }
  if ($type === 'cta') $ctas++;
  if ($type === 'video') $videos[$label] = (isset($videos[$label]) ? $videos[$label] : 0) + 1;
  if ($type === 'scroll') $depth = max($depth, (int)$label);
  if ($type === 'dwell' && !empty($e['ms'])) $dwell[$label] = (isset($dwell[$label]) ? $dwell[$label] : 0) + (int)$e['ms'];
}

arsort($byCase); arsort($refs); arsort($videos); arsort($dwell);

$recent = array_slice($all, -40);
$recent = array_reverse($recent);

json_out(array(
  'ok' => true,
  'visitors' => count($visitors),
  'sessions' => $sessions,
  'events' => count($all),
  'caseOpens' => $caseOpens,
  'ctas' => $ctas,
  'depth' => $depth,
  'byCase' => $byCase,
  'refs' => $refs,
  'videos' => $videos,
  'dwell' => $dwell,
  'series' => array_values($series),
  'recent' => $recent
));
