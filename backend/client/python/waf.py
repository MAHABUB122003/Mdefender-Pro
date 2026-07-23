"""
SecureWAF - Python Client

Usage (Flask):
    from client.python.waf import waf_middleware
    app.wsgi_app = waf_middleware(app.wsgi_app, api_key='YOUR_API_KEY')

Usage (Django):
    # In settings.py MIDDLEWARE:
    # Add 'client.python.waf.DjangoWAFMiddleware' at the top

That's it. Your website is protected.
"""

import json
import urllib.request
import urllib.error


class SecureWAF:
    def __init__(self, api_key, server='http://localhost:5000', timeout=3, block_page=True):
        if not api_key:
            raise ValueError('[SecureWAF] api_key is required. Get one from your WAF dashboard.')
        self.api_key = api_key
        self.server = server.rstrip('/')
        self.timeout = timeout
        self.block_page = block_page

    def analyze(self, url, method='GET', headers=None, body='', ip='unknown', query_params=None):
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
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read())
        except Exception:
            return {'status': 'allowed'}


def waf_middleware(app, api_key, server='http://localhost:5000', block_page=True):
    """Wrap a Flask/WSGI app with WAF protection."""
    waf = SecureWAF(api_key, server, block_page=block_page)

    def middleware(environ, start_response):
        path = environ.get('PATH_INFO', '/')
        query = environ.get('QUERY_STRING', '')
        method = environ.get('REQUEST_METHOD', 'GET')
        body = environ.get('wsgi.input').read(int(environ.get('CONTENT_LENGTH', 0) or 0)) if environ.get('wsgi.input') else b''
        ip = environ.get('HTTP_X_FORWARDED_FOR', environ.get('REMOTE_ADDR', 'unknown')).split(',')[0].strip()

        full_url = f'{path}?{query}' if query else path

        result = waf.analyze(
            url=full_url,
            method=method,
            headers={k: v for k, v in environ.items() if k.startswith('HTTP_')},
            body=body.decode('utf-8', errors='replace'),
            ip=ip,
        )

        if result.get('status') == 'blocked':
            block_html = result.get('block_page', '<h1>Blocked by WAF</h1>')
            response = block_html.encode('utf-8')
            start_response('403 Forbidden', [
                ('Content-Type', 'text/html'),
                ('Content-Length', str(len(response))),
            ])
            return [response]

        return app(environ, start_response)

    return middleware


class DjangoWAFMiddleware:
    """Django middleware: add to MIDDLEWARE in settings.py."""

    def __init__(self, get_response):
        from django.conf import settings
        self.get_response = get_response
        self.waf = SecureWAF(
            api_key=getattr(settings, 'WAF_API_KEY', ''),
            server=getattr(settings, 'WAF_SERVER', 'http://localhost:5000'),
            block_page=getattr(settings, 'WAF_BLOCK_PAGE', True),
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
            return HttpResponse(result.get('block_page', '<h1>Blocked by WAF</h1>'), status=403)

        return self.get_response(request)

    def _get_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')
