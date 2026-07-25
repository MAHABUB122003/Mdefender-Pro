<?php
/**
 * MDefender Pro - PHP WAF Client
 *
 * Usage (Plain PHP):
 *   require_once 'vendor/autoload.php';
 *   use MDefender\MDefender;
 *   
 *   $waf = new MDefender('YOUR_API_KEY');
 *   $waf->protect();  // Add at top of your PHP file
 *
 * Usage (Laravel):
 *   // In app/Http/Kernel.php, add to $middleware:
 *   \MDefender\LaravelMDefenderMiddleware::class,
 *
 * Usage (Symfony):
 *   // In config/services.yaml:
 *   App\EventSubscriber\MDefenderSubscriber:
 *       arguments:
 *           $apiKey: '%env(MDEFENDER_API_KEY)%'
 *
 * That's it. Your website is protected.
 */

namespace MDefender;

class MDefender
{
    private string $apiKey;
    private string $server;
    private int $timeout;
    private bool $debug;

    /**
     * Initialize MDefender client.
     *
     * @param string $apiKey Your MDefender Pro API key
     * @param string $server MDefender API server URL
     * @param int $timeout Request timeout in seconds
     * @param bool $debug Enable debug logging
     */
    public function __construct(string $apiKey, string $server = 'https://mdefender-pro.onrender.com', int $timeout = 5, bool $debug = false)
    {
        if (empty($apiKey)) {
            throw new \InvalidArgumentException('[MDefender] apiKey is required. Get one from https://mdefender-pro-6e3r.onrender.com');
        }
        
        $this->apiKey = $apiKey;
        $this->server = rtrim($server, '/');
        $this->timeout = $timeout;
        $this->debug = $debug;
    }

    /**
     * Analyze a request for threats.
     *
     * @param string $url Request URL/path
     * @param string $method HTTP method
     * @param array $headers Request headers
     * @param string $body Request body
     * @param string $ip Client IP address
     * @param array $queryParams Query parameters
     * @return array Analysis result
     */
    public function analyze(string $url, string $method = 'GET', array $headers = [], string $body = '', string $ip = 'unknown', array $queryParams = []): array
    {
        $payload = json_encode([
            'request' => [
                'url' => $url,
                'method' => $method,
                'headers' => $headers,
                'body' => $body,
                'ip' => $ip,
                'query_params' => $queryParams,
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
                'X-MDefender-Version: 1.1.0',
            ],
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($this->debug && $error) {
            error_log("[MDefender] cURL error: {$error}");
        }

        if ($response === false) {
            return ['status' => 'allowed'];
        }

        return json_decode($response, true) ?: ['status' => 'allowed'];
    }

    /**
     * Register a website with MDefender.
     *
     * @param string $domain Your website domain
     * @return array Connection result
     */
    public function connect(string $domain): array
    {
        $payload = json_encode(['domain' => $domain]);

        $ch = curl_init("{$this->server}/api/connect");
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

        return json_decode($response, true) ?: ['status' => 'error'];
    }

    /**
     * Get protection statistics.
     *
     * @return array Statistics
     */
    public function getStats(): array
    {
        $ch = curl_init("{$this->server}/api/stats");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->apiKey}",
            ],
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true) ?: ['status' => 'error'];
    }

    /**
     * Block an IP address.
     *
     * @param string $ip IP address to block
     * @return array Block result
     */
    public function blockIp(string $ip): array
    {
        $payload = json_encode(['ip' => $ip]);

        $ch = curl_init("{$this->server}/api/block");
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

        return json_decode($response, true) ?: ['status' => 'error'];
    }

    /**
     * Get attack logs.
     *
     * @param int $limit Number of logs to retrieve
     * @return array Attack logs
     */
    public function getLogs(int $limit = 100): array
    {
        $ch = curl_init("{$this->server}/api/logs?limit={$limit}");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->apiKey}",
            ],
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true) ?: ['status' => 'error'];
    }

    /**
     * Protect the current request (call at top of your PHP file).
     *
     * @return void
     */
    public function protect(): void
    {
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

        $result = $this->analyze($url, $method, $headers, $body, $ip, $_GET);

        if ($result['status'] === 'blocked') {
            header('HTTP/1.1 403 Forbidden');
            header('Content-Type: text/html; charset=utf-8');
            header('X-MDefender-Status: blocked');
            header('X-MDefender-Attack-Type: ' . ($result['attack_type'] ?? 'unknown'));
            echo $result['block_page'] ?? '<h1>Blocked by MDefender Pro WAF</h1>';
            exit;
        }
    }
}
