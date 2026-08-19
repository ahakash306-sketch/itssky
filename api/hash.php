<?php
/* Run this ONCE to generate your password hash, paste it into config.php,
   then DELETE this file from the server. */
$p = isset($_GET['p']) ? $_GET['p'] : '';
header('Content-Type: text/plain');
if ($p === '') { echo "Add ?p=yourpassword to the URL.\n"; exit; }
echo password_hash($p, PASSWORD_DEFAULT), "\n\nPaste that into config.php as ADMIN_HASH, then delete hash.php.\n";
