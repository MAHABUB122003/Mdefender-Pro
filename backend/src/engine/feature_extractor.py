import re
import urllib.parse
import os
import joblib

class FeatureExtractor:
    def __init__(self):
        engineer_path = os.path.join(os.path.dirname(__file__), '../../models/feature_engineer.pkl')
        self.engineer = None
        if os.path.exists(engineer_path):
            try:
                self.engineer = joblib.load(engineer_path)
            except Exception:
                pass

    def extract_features(self, parsed_request):
        url = parsed_request.get('url', '')
        body = parsed_request.get('body', '')
        query_string = parsed_request.get('query_string', '')
        query_params = parsed_request.get('query_params', {})
        query_values = ' '.join(str(v) for v in query_params.values()) if isinstance(query_params, dict) else ''
        body_fields = parsed_request.get('body_fields', {})
        body_field_values = parsed_request.get('body_field_values', '')
        parts = [p for p in [url, body, query_string, query_values, body_field_values] if p.strip()]
        combined = ' '.join(parts) if parts else url
        decoded = self._decode_payload(combined)
        if self.engineer:
            return self.engineer.extract_features(decoded)
        return self._fallback_features(decoded, url, body, query_string)

    def _decode_payload(self, text):
        decoded = text
        try:
            decoded = urllib.parse.unquote(decoded)
            decoded = urllib.parse.unquote(decoded)
        except:
            pass
        return decoded

    def _fallback_features(self, combined, url, body, query_string):
        features = {}
        features['url_length'] = len(url)
        features['body_length'] = len(body)
        features['num_params'] = 0
        features['has_special_chars'] = int(bool(re.search(r"[;'\"\-\-#\(\)]", combined)))
        features['has_sqli'] = 0
        features['has_xss'] = 0
        features['has_lfi'] = 0
        features['has_cmd_injection'] = 0
        features['has_csrf'] = 0
        features['num_encoded_chars'] = len(re.findall(r'%[0-9a-fA-F]{2}', combined))
        features['has_ua'] = 1
        features['is_suspicious'] = 0
        return features
