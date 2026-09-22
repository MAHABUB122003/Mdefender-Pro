import urllib.parse
import json
from src.engine.normalizer import DeepNormalizer

class RequestParser:
    def __init__(self):
        self.normalizer = DeepNormalizer()

    def parse(self, request_data):
        raw_url = request_data.get('url', '') or request_data.get('path', '')
        parsed_url = urllib.parse.urlparse(raw_url)
        path = parsed_url.path or raw_url
        query_param_val = request_data.get('query_params', '')
        if isinstance(query_param_val, dict):
            query_param_str = urllib.parse.urlencode(query_param_val)
        else:
            query_param_str = str(query_param_val) if query_param_val else ''

        query_str = request_data.get('query_string', '') or query_param_str or parsed_url.query
        
        parsed = {
            'url': raw_url if '?' in raw_url or not query_str else f"{path}?{query_str}",
            'path': path,
            'query_string': query_str,
            'method': request_data.get('method', 'GET'),
            'headers': request_data.get('headers', {}),
            'body': request_data.get('body', ''),
            'query_params': query_param_val if isinstance(query_param_val, dict) else urllib.parse.parse_qs(query_str),
            'ip': request_data.get('ip', ''),
            'user_agent': request_data.get('user_agent') or request_data.get('headers', {}).get('User-Agent', ''),
            'referer': request_data.get('referer') or request_data.get('headers', {}).get('Referer', ''),
            'cookies': request_data.get('cookies') or request_data.get('headers', {}).get('Cookie', ''),
            'content_type': request_data.get('content_type') or request_data.get('headers', {}).get('Content-Type', '')
        }
        parsed['body_fields'] = self._extract_body_fields(parsed['body'], parsed['content_type'])
        parsed['body_field_values'] = ' '.join(str(v) for v in parsed['body_fields'].values()) if parsed['body_fields'] else ''
        
        # Deeply normalized fields for zero-bypass inspection
        parsed['normalized_path'] = self.normalizer.normalize(parsed['path'])
        parsed['normalized_query'] = self.normalizer.normalize(parsed['query_string'])
        parsed['normalized_body'] = self.normalizer.normalize(parsed['body'])
        parsed['normalized_body_values'] = self.normalizer.normalize(parsed['body_field_values'])
        parsed['normalized_user_agent'] = self.normalizer.normalize(parsed['user_agent'])
        parsed['normalized_referer'] = self.normalizer.normalize(parsed['referer'])
        parsed['normalized_cookies'] = self.normalizer.normalize(parsed['cookies'])

        # Aggregate payload strings for multi-pass scans
        raw_parts = [
            parsed['path'],
            parsed['query_string'],
            parsed['body'],
            parsed['body_field_values'],
            parsed['user_agent'],
            parsed['referer'],
            parsed['cookies']
        ]
        parsed['combined_raw'] = ' '.join(str(p) for p in raw_parts if str(p).strip())
        parsed['combined_normalized'] = self.normalizer.normalize(parsed['combined_raw'])
        parsed['normalized_variants'] = self.normalizer.get_all_normalized_variants(parsed['combined_raw'])

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
