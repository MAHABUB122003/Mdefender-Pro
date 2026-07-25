<?php
/**
 * MDefender Pro - Symfony Event Subscriber
 *
 * Usage:
 *   // In config/services.yaml:
 *   App\EventSubscriber\MDefenderSubscriber:
 *       arguments:
 *           $apiKey: '%env(MDEFENDER_API_KEY)%'
 *           $server: '%env(MDEFENDER_SERVER)%'
 *
 *   // In config/packages/mdefender.yaml (optional):
 *   services:
 *       App\EventSubscriber\MDefenderSubscriber:
 *           arguments:
 *               $apiKey: '%env(MDEFENDER_API_KEY)%'
 */

namespace MDefender;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class SymfonyMDefenderSubscriber implements EventSubscriberInterface
{
    private MDefender $waf;

    public function __construct(string $apiKey, string $server = 'https://mdefender-pro.onrender.com', int $timeout = 5)
    {
        $this->waf = new MDefender($apiKey, $server, $timeout);
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 100],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        
        $result = $this->waf->analyze(
            url: $request->getRequestUri(),
            method: $request->getMethod(),
            headers: array_map(fn($v) => is_array($v) ? implode(', ', $v) : $v, $request->headers->all()),
            body: $request->getContent() ?: '',
            ip: $request->getClientIp() ?? 'unknown',
            queryParams: $request->query->all()
        );

        if ($result['status'] === 'blocked') {
            $blockPage = $result['block_page'] ?? '<h1>Blocked by MDefender Pro WAF</h1>';
            
            $response = new Response($blockPage, 403, [
                'Content-Type' => 'text/html; charset=utf-8',
                'X-MDefender-Status' => 'blocked',
                'X-MDefender-Attack-Type' => $result['attack_type'] ?? 'unknown',
            ]);
            
            $event->setResponse($response);
        }
    }
}
