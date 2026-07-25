# MDefender Pro - PHP WAF Client

[![Latest Stable Version](https://poser.pugx.org/mdefender/mdefender/v/stable)](https://packagist.org/packages/mdefender/mdefender)
[![License](https://poser.pugx.org/mdefender/mdefender/license)](https://packagist.org/packages/mdefender/mdefender)

**MDefender Pro** is a Web Application Firewall (WAF) client for PHP. It protects plain PHP, Laravel, and Symfony applications against web attacks including XSS, SQLi, CSRF, and other OWASP Top 10 threats.

## Installation

```bash
composer require mdefender/mdefender
```

## Quick Start

### Plain PHP

```php
<?php
require_once 'vendor/autoload.php';

use MDefender\MDefender;

$waf = new MDefender('your-api-key-here');
$waf->protect();  // Add at top of your PHP file

// Your application code continues...
```

### Laravel

Add to `app/Http/Kernel.php` in the `$middleware` array:

```php
protected $middleware = [
    // ... other middleware
    \MDefender\LaravelMDefenderMiddleware::class,
];
```

Add to `.env`:

```
MDEFENDER_API_KEY=your-api-key-here
MDEFENDER_SERVER=https://mdefender-pro.onrender.com
```

### Symfony

Add to `config/services.yaml`:

```yaml
services:
    App\EventSubscriber\MDefenderSubscriber:
        arguments:
            $apiKey: '%env(MDEFENDER_API_KEY)%'
            $server: '%env(MDEFENDER_SERVER)%'
```

Add to `.env`:

```
MDEFENDER_API_KEY=your-api-key-here
MDEFENDER_SERVER=https://mdefender-pro.onrender.com
```

## Configuration

### Plain PHP

```php
$waf = new MDefender(
    apiKey: 'your-api-key-here',
    server: 'https://mdefender-pro.onrender.com',  // Default
    timeout: 5,  // Request timeout in seconds
    debug: false  // Enable debug logging
);
```

### Laravel

Add to `config/services.php`:

```php
'mdefender' => [
    'api_key' => env('MDEFENDER_API_KEY'),
    'server' => env('MDEFENDER_SERVER', 'https://mdefender-pro.onrender.com'),
    'timeout' => env('MDEFENDER_TIMEOUT', 5),
    'debug' => env('MDEFENDER_DEBUG', false),
],
```

For route-specific protection in Laravel:

```php
// In app/Http/Kernel.php, add to $routeMiddleware:
'mdefender' => \MDefender\LaravelMDefenderMiddleware::class,

// In routes/web.php:
Route::middleware(['mdefender'])->group(function () {
    // routes to protect
});
```

## Advanced Usage

### Direct Client Usage

You can use the client directly without middleware:

```php
use MDefender\MDefender;

$waf = new MDefender('your-api-key-here');

// Analyze a request
$result = $waf->analyze(
    url: '/api/users?id=1',
    method: 'GET',
    headers: ['User-Agent' => 'Mozilla/5.0'],
    ip: '192.168.1.1'
);

if ($result['status'] === 'blocked') {
    echo 'Blocked: ' . $result['attack_type'];
} else {
    echo 'Request allowed';
}
```

### Get Protection Statistics

```php
$stats = $waf->getStats();
echo 'Blocked attacks: ' . $stats['blocked_count'];
```

### Block an IP Address

```php
$result = $waf->blockIp('192.168.1.100');
print_r($result);
```

### Get Attack Logs

```php
$logs = $waf->getLogs(limit: 50);
foreach ($logs['logs'] as $log) {
    echo "{$log['ip']} - {$log['attack_type']} - {$log['timestamp']}\n";
}
```

## How It Works

1. A request hits your PHP application
2. MDefender intercepts it and builds a payload (method, URL, headers, body, IP, etc.)
3. The payload is sent to the MDefender Pro API for analysis
4. If the API detects a threat, it returns a `blocked` status with attack details
5. MDefender renders a block page and returns 403 status
6. If safe, the request continues to your application

## API Reference

### `MDefender($apiKey, $server, $timeout, $debug)`

Initialize the WAF client.

**Parameters:**
- `$apiKey` (string, required) - Your MDefender Pro API key
- `$server` (string) - API server URL (default: `https://mdefender-pro.onrender.com`)
- `$timeout` (int) - Request timeout in seconds (default: 5)
- `$debug` (bool) - Enable debug logging (default: false)

### `analyze($url, $method, $headers, $body, $ip, $queryParams)`

Analyze a request for threats.

**Returns:** Array with `status`, `attack_type`, `confidence`, etc.

### `protect()`

Protect the current request (call at top of your PHP file).

### `getStats()`

Get protection statistics.

### `blockIp($ip)`

Block an IP address.

### `getLogs($limit)`

Get attack logs.

## Requirements

- PHP >= 7.4
- cURL extension

## License

MIT
