import re
import numpy as np

class WAFFeatureEngineer:
    def __init__(self):
        self.sql_patterns = [
            r'select\s+.*\s+from', r'insert\s+into', r'update\s+.*\s+set',
            r'delete\s+from', r'drop\s+table', r'union\s+select',
            r'order\s+by', r'group\s+by', r'having', r"like\s+['\"%]",
            r'/\*.*\*/', r'--', r'#', r'information_schema',
            r'pg_sleep', r'benchmark', r'load_file', r'into\s+outfile'
        ]
        self.xss_patterns = [
            r'<script', r'</script>', r'javascript:', r'onerror=',
            r'onload=', r'onclick=', r'onmouseover=', r'alert\(',
            r'prompt\(', r'confirm\(', r'document\.', r'window\.',
            r'\.cookie', r'localStorage', r'eval\(', r'setTimeout\(',
            r'<iframe', r'<object', r'<embed', r'<svg', r'<img'
        ]
        self.lfi_patterns = [
            r'\.\./', r'\.\.\\\\', r'/etc/passwd', r'/etc/shadow',
            r'/etc/hosts', r'c:\\windows', r'boot\.ini',
            r'web\.config', r'\.htaccess', r'php://', r'file://'
        ]
        self.ssti_patterns = [
            r'{{.*}}', r'\${.*}', r'#{.*}', r'\*{.*}',
            r'__class__', r'__mro__', r'__subclasses__',
            r'__builtins__', r'__import__', r'eval\('
        ]
        self.rce_patterns = [
            r';.*\s+', r'\|.*\s+',
            r'`.*`', r'\$\(.*\)', r'bash\s+-c', r'sh\s+-c',
            r'whoami', r'id\s+', r'uname', r'cat\s+', r'ls\s+',
            r'wget\s+', r'curl\s+'
        ]
        self.ssrf_patterns = [
            r'169.254.169.254', r'127.0.0.1', r'localhost',
            r'metadata', r'instance-data', r'0.0.0.0'
        ]

    def extract_features(self, text):
        if not isinstance(text, str):
            text = str(text)
        text_lower = text.lower()
        features = {}
        features['length'] = min(len(text), 2000)
        features['length_log'] = np.log1p(len(text))
        features['words'] = min(len(text.split()), 50)
        features['avg_word_len'] = len(text) / max(1, len(text.split()))
        special = re.findall(r'[!@#$%^&*()_+=\[\]{}|;:,.<>?/\\`~"\']', text)
        features['special_chars'] = min(len(special), 50)
        features['special_ratio'] = len(special) / max(1, len(text))
        features['quotes'] = min(text.count("'") + text.count('"'), 20)
        features['slashes'] = min(text.count('/') + text.count('\\'), 20)
        features['equals'] = min(text.count('='), 20)
        features['question'] = min(text.count('?'), 20)
        features['percent'] = min(text.count('%'), 20)
        features['semicolon'] = min(text.count(';'), 20)
        features['ampersand'] = min(text.count('&'), 20)
        features['hash'] = min(text.count('#'), 20)
        features['colon'] = min(text.count(':'), 20)
        features['space'] = min(text.count(' '), 20)
        digits = len(re.findall(r'\d', text))
        features['digits'] = min(digits, 50)
        features['digit_ratio'] = digits / max(1, len(text))
        features['has_ip'] = 1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', text) else 0
        url_encoded = re.findall(r'%[0-9a-fA-F]{2}', text)
        features['url_encoded'] = min(len(url_encoded), 50)
        features['has_url_encoding'] = 1 if url_encoded else 0
        features['has_double_encoding'] = 1 if re.search(r'%25[0-9a-fA-F]{2}', text) else 0
        features['has_unicode'] = 1 if re.search(r'\\u[0-9a-fA-F]{4}', text) else 0
        sql_score = sum(1 for p in self.sql_patterns if re.search(p, text_lower))
        features['sql_score'] = min(sql_score / 5.0, 1.0)
        xss_score = sum(1 for p in self.xss_patterns if re.search(p, text_lower))
        features['xss_score'] = min(xss_score / 5.0, 1.0)
        lfi_score = sum(1 for p in self.lfi_patterns if re.search(p, text_lower))
        features['lfi_score'] = min(lfi_score / 5.0, 1.0)
        ssti_score = sum(1 for p in self.ssti_patterns if re.search(p, text_lower))
        features['ssti_score'] = min(ssti_score / 5.0, 1.0)
        rce_score = sum(1 for p in self.rce_patterns if re.search(p, text_lower))
        features['rce_score'] = min(rce_score / 5.0, 1.0)
        ssrf_score = sum(1 for p in self.ssrf_patterns if re.search(p, text_lower))
        features['ssrf_score'] = min(ssrf_score / 5.0, 1.0)
        features['total_attack_score'] = min(
            features['sql_score'] + features['xss_score'] +
            features['lfi_score'] + features['ssti_score'] +
            features['rce_score'] + features['ssrf_score'], 1.0
        )
        features['has_protocol'] = 1 if re.search(r'https?://|ftp://', text_lower) else 0
        features['has_question'] = 1 if '?' in text else 0
        features['has_equal'] = 1 if '=' in text else 0
        features['has_ampersand'] = 1 if '&' in text else 0
        features['has_underscore'] = 1 if '_' in text else 0
        features['has_dash'] = 1 if '-' in text else 0
        features['has_dot'] = 1 if '.' in text else 0
        features['has_at'] = 1 if '@' in text else 0
        if text:
            prob = [float(text.count(c)) / len(text) for c in set(text)]
            entropy = -sum([p * np.log2(p) for p in prob])
            features['entropy'] = min(entropy, 8.0)
        else:
            features['entropy'] = 0
        features['unique_chars'] = min(len(set(text)), 100)
        features['unique_ratio'] = len(set(text)) / max(1, len(text))
        return features
