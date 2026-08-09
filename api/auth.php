<?php
/* Login / logout / session check for the admin panel. */
require __DIR__ . '/config.php';

$action = isset($_GET['action']) ? $_GET['action'] : 'status';

if ($action === 'login') {
  $body = body_json();
  $pw = isset($body['password']) ? $body['password'] : '';
  /* Constant-ish delay so failed attempts can't be timed or hammered quickly. */
  usleep(400000);
  if ($pw !== '' && password_verify($pw, ADMIN_HASH)) {
    session_regenerate_id(true);
    $_SESSION['portfolio_admin'] = true;
    json_out(array('ok' => true));
  }
  json_out(array('ok' => false, 'error' => 'bad_password'), 401);
}

if ($action === 'logout') {
  $_SESSION = array();
  session_destroy();
  json_out(array('ok' => true));
}

json_out(array('ok' => true, 'admin' => is_admin()));
