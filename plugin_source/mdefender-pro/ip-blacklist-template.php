<?php
/**
 * MDefender-Pro Authentic Standard 403 Forbidden Template
 *
 * Universal standard 403 Forbidden page matching Nginx / Chromium HTTP network standards.
 *
 * @package MDefender-Pro
 */

if (!headers_sent()) {
    if (function_exists('http_response_code')) {
        http_response_code(403);
    }
    header('HTTP/1.1 403 Forbidden', true, 403);
    header('Status: 403 Forbidden');
    header('Content-Type: text/html; charset=UTF-8');
    header('Server: nginx');
    header('Connection: close');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('X-Protected-By: MDefender-Pro');
}
?><html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx</center>
</body>
</html><?php
exit;
