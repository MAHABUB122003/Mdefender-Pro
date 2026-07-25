<?php
/**
 * MDefender Pro - Laravel Middleware
 *
 * Usage:
 *   // In app/Http/Kernel.php, add to $middleware:
 *   \MDefender\LaravelMDefenderMiddleware::class,
 *
 *   // Or for route-specific protection:
 *   // In routes/web.php:
 *   Route::middleware(['mdefender'])->group(function () {
 *       // routes to protect
 *   });
 *
 *   // In app/Http/Kernel.php, add to $routeMiddleware:
 *   'mdefender' => \MDefender\LaravelMDefenderMiddleware::class,
 */

namespace MDefender;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LaravelMDefenderMiddleware
{
    private MDefender $waf;

    public function __construct()
    {
        $this->waf = new MDefender(
            apiKey: config('services.mdefender.api_key', env('MDEFENDER_API_KEY', '')),
            server: config('services.mdefender.server', env('MDEFENDER_SERVER', 'https://mdefender-pro.onrender.com')),
            timeout: config('services.mdefender.timeout', 5),
            debug: config('services.mdefender.debug', false)
        );
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $result = $this->waf->analyze(
            url: $request->getRequestUri(),
            method: $request->method(),
            headers: $request->headers->all(),
            body: $request->getContent() ?: '',
            ip: $this->getClientIp($request),
            queryParams: $request->query()
        );

        if ($result['status'] === 'blocked') {
            $blockPage = $result['block_page'] ?? '<h1>Blocked by MDefender Pro WAF</h1>';
            
            return response($blockPage, 403, [
                'Content-Type' => 'text/html; charset=utf-8',
                'X-MDefender-Status' => 'blocked',
                'X-MDefender-Attack-Type' => $result['attack_type'] ?? 'unknown',
            ]);
        }

        return $next($request);
    }

    /**
     * Get client IP address.
     */
    private function getClientIp(Request $request): string
    {
        $xff = $request->header('X-Forwarded-For');
        if ($xff) {
            return explode(',', $xff)[0];
        }
        
        return $request->ip() ?? 'unknown';
    }
}
