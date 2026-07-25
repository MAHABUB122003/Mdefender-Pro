"""
MDefender Pro - Python WAF Client

Usage (Flask):
    from mdefender import waf_middleware
    app.wsgi_app = waf_middleware(app.wsgi_app, api_key='YOUR_API_KEY')

Usage (Django):
    # In settings.py MIDDLEWARE:
    MIDDLEWARE = [
        'mdefender.DjangoWAFMiddleware',
        # ... other middleware
    ]
    
    # In settings.py:
    MDEFENDER_API_KEY = 'YOUR_API_KEY'
    MDEFENDER_SERVER = 'https://mdefender-pro.onrender.com'

That's it. Your website is protected.
"""

import json
import urllib.request
import urllib.error
import logging

logger = logging.getLogger('mdefender')


class MDefender:
    """MDefender Pro WAF Client"""
    
    def __init__(self, api_key, server='https://mdefender-pro.onrender.com', timeout=5):
        """
        Initialize MDefender client.
        
        Args:
            api_key: Your MDefender Pro API key
            server: MDefender API server URL
            timeout: Request timeout in seconds
        """
        if not api_key:
            raise ValueError('[MDefender] api_key is required. Get one from https://mdefender-pro-6e3r.onrender.com')
        
        self.api_key = api_key
        self.server = server.rstrip('/')
        self.timeout = timeout
    
    def analyze(self, url, method='GET', headers=None, body='', ip='unknown', query_params=None):
        """
        Analyze a request for threats.
        
        Args:
            url: Request URL/path
            method: HTTP method
            headers: Request headers dict
            body: Request body
            ip: Client IP address
            query_params: Query parameters dict
            
        Returns:
            dict: Analysis result with 'status', 'attack_type', 'confidence', etc.
        """
        payload = json.dumps({
            'request': {
                'url': url,
                'method': method,
                'headers': headers or {},
                'body': body,
                'ip': ip,
                'query_params': query_params or {},
            }
        }).encode('utf-8')
        
        req = urllib.request.Request(
            f'{self.server}/api/analyze',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}',
                'X-MDefender-Version': '1.1.0',
            },
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            logger.error(f'MDefender API error: {e}')
            return {'status': 'allowed'}
    
    def connect(self, domain):
        """
        Register a website with MDefender.
        
        Args:
            domain: Your website domain
            
        Returns:
            dict: Connection result
        """
        payload = json.dumps({'domain': domain}).encode('utf-8')
        
        req = urllib.request.Request(
            f'{self.server}/api/connect',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}',
            },
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            logger.error(f'MDefender connect error: {e}')
            return {'status': 'error', 'message': str(e)}
    
    def get_stats(self):
        """
        Get protection statistics.
        
        Returns:
            dict: Statistics including blocked attacks, allowed requests, etc.
        """
        req = urllib.request.Request(
            f'{self.server}/api/stats',
            headers={
                'Authorization': f'Bearer {self.api_key}',
            },
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            logger.error(f'MDefender stats error: {e}')
            return {'status': 'error', 'message': str(e)}
    
    def block_ip(self, ip):
        """
        Block an IP address.
        
        Args:
            ip: IP address to block
            
        Returns:
            dict: Block result
        """
        payload = json.dumps({'ip': ip}).encode('utf-8')
        
        req = urllib.request.Request(
            f'{self.server}/api/block',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}',
            },
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            logger.error(f'MDefender block error: {e}')
            return {'status': 'error', 'message': str(e)}
    
    def get_logs(self, limit=100):
        """
        Get attack logs.
        
        Args:
            limit: Number of logs to retrieve
            
        Returns:
            dict: Attack logs
        """
        req = urllib.request.Request(
            f'{self.server}/api/logs?limit={limit}',
            headers={
                'Authorization': f'Bearer {self.api_key}',
            },
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            logger.error(f'MDefender logs error: {e}')
            return {'status': 'error', 'message': str(e)}


def waf_middleware(app, api_key, server='https://mdefender-pro.onrender.com', block_page=True):
    """
    Wrap a Flask/WSGI app with WAF protection.
    
    Args:
        app: Flask/WSGI application
        api_key: Your MDefender Pro API key
        server: MDefender API server URL
        block_page: Whether to return block page HTML
        
    Returns:
        Wrapped WSGI application
    """
    waf = MDefender(api_key, server)
    
    def middleware(environ, start_response):
        path = environ.get('PATH_INFO', '/')
        query = environ.get('QUERY_STRING', '')
        method = environ.get('REQUEST_METHOD', 'GET')
        
        # Read request body
        body = b''
        if environ.get('wsgi.input'):
            content_length = int(environ.get('CONTENT_LENGTH', 0) or 0)
            if content_length > 0:
                body = environ['wsgi.input'].read(content_length)
        
        # Get client IP
        ip = environ.get('HTTP_X_FORWARDED_FOR', environ.get('REMOTE_ADDR', 'unknown'))
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        
        # Build URL
        full_url = f'{path}?{query}' if query else path
        
        # Get headers
        headers = {k: v for k, v in environ.items() if k.startswith('HTTP_')}
        
        # Analyze request
        result = waf.analyze(
            url=full_url,
            method=method,
            headers=headers,
            body=body.decode('utf-8', errors='replace'),
            ip=ip,
        )
        
        if result.get('status') == 'blocked':
            block_html = result.get('block_page', '<h1>Blocked by MDefender Pro WAF</h1>')
            response = block_html.encode('utf-8')
            start_response('403 Forbidden', [
                ('Content-Type', 'text/html'),
                ('Content-Length', str(len(response))),
                ('X-MDefender-Status', 'blocked'),
                ('X-MDefender-Attack-Type', result.get('attack_type', 'unknown')),
            ])
            return [response]
        
        return app(environ, start_response)
    
    return middleware


class DjangoWAFMiddleware:
    """
    Django middleware for MDefender Pro WAF.
    
    Add to settings.py:
        MIDDLEWARE = [
            'mdefender.DjangoWAFMiddleware',
            # ... other middleware
        ]
        
        MDEFENDER_API_KEY = 'YOUR_API_KEY'
        MDEFENDER_SERVER = 'https://mdefender-pro.onrender.com'
    """
    
    def __init__(self, get_response):
        from django.conf import settings
        self.get_response = get_response
        self.waf = MDefender(
            api_key=getattr(settings, 'MDEFENDER_API_KEY', ''),
            server=getattr(settings, 'MDEFENDER_SERVER', 'https://mdefender-pro.onrender.com'),
        )
    
    def __call__(self, request):
        result = self.waf.analyze(
            url=request.get_full_path(),
            method=request.method,
            headers=dict(request.headers),
            body=request.body.decode('utf-8', errors='replace') if request.body else '',
            ip=self._get_ip(request),
        )
        
        if result.get('status') == 'blocked':
            from django.http import HttpResponse
            return HttpResponse(
                result.get('block_page', '<h1>Blocked by MDefender Pro WAF</h1>'),
                status=403,
                headers={
                    'X-MDefender-Status': 'blocked',
                    'X-MDefender-Attack-Type': result.get('attack_type', 'unknown'),
                }
            )
        
        return self.get_response(request)
    
    def _get_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')
