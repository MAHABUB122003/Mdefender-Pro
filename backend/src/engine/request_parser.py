import urllib.parse
import json

class RequestParser:
    def __init__(self):
        pass

    def parse(self, request_data):
        parsed = {
            'url': request_data.get('url', ''),
            'method': request_data.get('method', 'GET'),
            'headers': request_data.get('headers', {}),
            'body': request_data.get('body', ''),
            'query_params': request_data.get('query_params', {}),
            'ip': request_data.get('ip', ''),
            'user_agent': request_data.get('headers', {}).get('User-Agent', ''),
            'referer': request_data.get('headers', {}).get('Referer', ''),
            'cookies': request_data.get('headers', {}).get('Cookie', ''),
            'content_type': request_data.get('headers', {}).get('Content-Type', '')
        }
        parsed['path'] = urllib.parse.urlparse(parsed['url']).path
        parsed['query_string'] = urllib.parse.urlparse(parsed['url']).query
        parsed['body_fields'] = self._extract_body_fields(parsed['body'], parsed['content_type'])
        parsed['body_field_values'] = ' '.join(str(v) for v in parsed['body_fields'].values()) if parsed['body_fields'] else ''
        return parsed

    def extract_parameters(self, body, content_type='application/x-www-form-urlencoded'):
        params = {}
        if not body:
            return params
        if 'json' in content_type:
            try:
                params = json.loads(body)
            except:
                pass
        elif 'form' in content_type:
            try:
                parsed = urllib.parse.parse_qs(body)
                for k, v in parsed.items():
                    params[k] = v[0] if len(v) == 1 else v
            except:
                pass
        return params

    def _extract_body_fields(self, body, content_type):
        if not body or not body.strip():
            return {}
        if 'json' in content_type:
            return self._parse_json_body(body)
        elif 'form' in content_type:
            return self._parse_form_body(body)
        return {}

    def _parse_json_body(self, body):
        try:
            data = json.loads(body)
            if isinstance(data, dict):
                return self._flatten_dict(data)
            elif isinstance(data, list):
                return self._flatten_list(data)
            return {}
        except (json.JSONDecodeError, ValueError):
            return {}

    def _parse_form_body(self, body):
        try:
            parsed = urllib.parse.parse_qs(body)
            result = {}
            for k, v in parsed.items():
                result[k] = v[0] if len(v) == 1 else ' '.join(v)
            return result
        except Exception:
            return {}

    def _flatten_dict(self, data, prefix=''):
        result = {}
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                result.update(self._flatten_dict(value, full_key))
            elif isinstance(value, list):
                result.update(self._flatten_list(value, full_key))
            else:
                result[full_key] = str(value)
        return result

    def _flatten_list(self, data, prefix='items'):
        result = {}
        for i, item in enumerate(data):
            full_key = f"{prefix}[{i}]"
            if isinstance(item, dict):
                result.update(self._flatten_dict(item, full_key))
            elif isinstance(item, list):
                result.update(self._flatten_list(item, full_key))
            else:
                result[full_key] = str(item)
        return result
