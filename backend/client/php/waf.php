<?php
/**
 * SecureWAF - PHP Client
 *
 * Usage:
 *   require_once 'client/php/waf.php';
 *   $waf = new SecureWAF('YOUR_API_KEY');
 *   $waf->protect();  // Add at top of your PHP file
 *
 * That's it. Your website is protected.
 */

class SecureWAF {
    private $apiKey;
    private $server;
    private $timeout;

    public function __construct($apiKey, $server = 'http://localhost:5000', $timeout = 3) {
        if (empty($apiKey)) {
            throw new Exception('[SecureWAF] apiKey is required. Get one from your WAF dashboard.');
        }
        $this->apiKey = $apiKey;
        $this->server = rtrim($server, '/');
        $this->timeout = $timeout;
    }

    public function analyze($url, $method = 'GET', $headers = [], $body = '', $ip = 'unknown') {
        $payload = json_encode([
            'request' => [
                'url' => $url,
                'method' => $method,
                'headers' => $headers,
                'body' => $body,
                'ip' => $ip,
                'query_params' => $_GET,
            ]
        ]);

        $ch = curl_init("{$this->server}/api/analyze");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                "Authorization: Bearer {$this->apiKey}",
            ],
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        if ($response === false) {
            return ['status' => 'allowed'];
        }

        return json_decode($response, true) ?: ['status' => 'allowed'];
    }

    public function protect() {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (strpos($ip, ',') !== false) {
            $ip = trim(explode(',', $ip)[0]);
        }

        $url = $_SERVER['REQUEST_URI'] ?? '/';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $body = file_get_contents('php://input') ?: '';
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $headerName = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$headerName] = $value;
            }
        }

        $result = $this->analyze($url, $method, $headers, $body, $ip);

        if ($result['status'] === 'blocked') {
            header('HTTP/1.1 403 Forbidden');
            header('Content-Type: text/html');
            echo $result['block_page'] ?? '<h1>Blocked by Web Application Firewall</h1>';
            exit;
        }
    }
}
