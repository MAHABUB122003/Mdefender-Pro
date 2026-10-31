<?php
/**
 * Dead Network Template — 100% Authentic Nginx / HTTP 502 Bad Gateway
 *
 * Universal standard 502 Bad Gateway network screen matching official Nginx
 * and web gateway standards. Clean, hard, and unbypassable.
 *
 * @package MDefender-Pro
 */

if (function_exists('http_response_code')) {
    http_response_code(502);
}
if (!headers_sent()) {
    header('HTTP/1.1 502 Bad Gateway', true, 502);
    header('Status: 502 Bad Gateway');
    header('Server: nginx');
    header('Content-Type: text/html; charset=UTF-8');
    header('Connection: close');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
}
?><!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>502 Bad Gateway</title>
<style>
body {
    background-color: #ffffff;
    color: #222222;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    margin: 0;
    padding: 0;
}
@media (prefers-color-scheme: dark) {
    body { background-color: #121212; color: #eeeeee; }
    hr { border-color: #333333 !important; }
}
.container {
    margin: 0 auto;
    margin-top: 22vh;
    text-align: center;
    max-width: 600px;
    padding: 0 20px;
}
h1 {
    font-size: 34px;
    font-weight: 500;
    margin: 0 0 12px 0;
    letter-spacing: -0.5px;
}
hr {
    border: 0;
    border-top: 1px solid #dddddd;
    margin: 16px auto;
    max-width: 500px;
}
.server {
    font-size: 14px;
    color: #777777;
}
</style>
</head>
<body>
<div class="container">
    <h1>502 Bad Gateway</h1>
    <hr>
    <div class="server">nginx</div>
</div>
</body>
</html>
