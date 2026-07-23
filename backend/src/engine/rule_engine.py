import re
import urllib.parse
from datetime import datetime
import logging

_log = logging.getLogger(__name__)


class RuleEngine:
    def __init__(self):
        self._db = None
        self.default_rules = []
        self._load_rules()

    def _get_db(self):
        if self._db is None:
            from src.database.mongodb_connection import MongoDB
            self._db = MongoDB()
        return self._db

    def _get_default_rules(self):
        return [
            {'name': 'SQL Injection - Union Select', 'pattern': r'(?i)(\bUNION\b.*\bSELECT\b)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - Drop Table', 'pattern': r'(?i)(\bDROP\b.*\bTABLE\b)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - OR/AND Bypass', 'pattern': r"(?i)('\s*(OR|AND)\s+['\w])", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - Comment Bypass', 'pattern': r"(?i)(--\s*$|\/\*[\s\S]*\*\/)", 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'SQL Injection - Stacked Queries', 'pattern': r"(?i)(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER))", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - Hex/Char Encoding', 'pattern': r"(?i)(0x[0-9a-f]+|CHAR\s*\()", 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'SQL Injection - Keywords', 'pattern': r"(?i)(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - Time Based', 'pattern': r"(?i)(\bSLEEP\s*\(|BENCHMARK\s*\()", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - File Access', 'pattern': r"(?i)(LOAD_FILE\s*\(|INTO\s+(OUT|DUMP)FILE)", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SQL Injection - SELECT FROM', 'pattern': r"(?i)(\bSELECT\b.*\bFROM\b)", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'XSS - Script Tag', 'pattern': r'(?i)(<script[^>]*>)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'XSS - Event Handler', 'pattern': r'(?i)\bon\w+\s*=', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'XSS - JavaScript Protocol', 'pattern': r'(?i)(javascript\s*:)', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'XSS - Dangerous Tags', 'pattern': r'(?i)(<\s*(svg|img|iframe|object|embed|form|input|body|meta|link|base)\b[^>]*>)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'XSS - Alert/Confirm/Prompt', 'pattern': r'(?i)(alert\s*\(|confirm\s*\(|prompt\s*\()', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'XSS - Eval/Document/Window', 'pattern': r'(?i)(eval\s*\(|document\.(cookie|write|location)|window\.location)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'LFI - Directory Traversal', 'pattern': r'(?i)(\.\.\/|\.\.\\)', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'LFI - etc/passwd', 'pattern': r'(?i)(\/etc\/(passwd|shadow|hosts))', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'LFI - PHP Filter', 'pattern': r'(?i)(php:\/\/|file:\/\/|data:\/\/)', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'LFI - Windows Paths', 'pattern': r'(?i)(c:\\windows|boot\.ini|web\.config|\.htaccess)', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'RCE - Backtick Exec', 'pattern': r'`[^`]+`', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'RCE - Dollar Paren', 'pattern': r'\$\([^)]+\)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'RCE - Dollar Brace', 'pattern': r'\$\{[^}]+\}', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'RCE - System Commands', 'pattern': r'(?i)(;\s*(ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell|wget|curl)\b)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'RCE - Pipe Commands', 'pattern': r'(?i)(\|\s*(ls|cat|id|whoami|ping|nc|bash|sh|cmd|powershell)\b)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SSTI - Template Syntax', 'pattern': r'(\{\{.*?\}\}|\{%.*?%\}|\#\{.*?\})', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SSTI - Python Internals', 'pattern': r'(?i)(__class__|__mro__|__subclasses__|__builtins__|__import__)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SSRF - Internal IP', 'pattern': r'(?i)(169\.254\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'SSRF - Cloud Metadata', 'pattern': r'(?i)(/latest/meta-data|/computeMetadata|metadata\.google)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'XXE - DOCTYPE/ENTITY', 'pattern': r'(?i)(<!DOCTYPE|<!ENTITY|SYSTEM\s+["\'])', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'Open Redirect - URL Redirect', 'pattern': r'(?i)(redirect\s*=\s*https?://|return\s*=\s*https?://|next\s*=\s*https?://|url\s*=\s*https?://)', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'NoSQL Injection - $gt/$gte', 'pattern': r'["\']?\$gt["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $ne/$nin', 'pattern': r'["\']?\$(ne|nin)["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $regex', 'pattern': r'["\']?\$regex["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $where', 'pattern': r'["\']?\$where["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $exists', 'pattern': r'["\']?\$exists["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $or/$and', 'pattern': r'["\']?\$(or|and)["\']?\s*:\s*\[', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $unset/$set', 'pattern': r'["\']?\$(unset|set|push|pull|pop|inc|mul|rename|currentDate)["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $function/$accumulator', 'pattern': r'["\']?\$(function|accumulator|mapReduce|aggregate|group)["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $expr', 'pattern': r'["\']?\$expr["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'NoSQL Injection - $jsonSchema', 'pattern': r'["\']?\$jsonSchema["\']?\s*:', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'Header Injection - CRLF', 'pattern': r'(\r\n|\r|\n)\s*(Content-Type|Set-Cookie|Location|Authorization)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'Input - Null Byte', 'pattern': r'(\x00|%00)', 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'Input - Excessive Length Field', 'pattern': r'(.{5000,})', 'action': 'block', 'severity': 'medium', 'enabled': True},
            {'name': 'SQL Injection - Information Extract', 'pattern': r"(?i)(pg_sleep|waitfor\s+delay|dbms_lock\.sleep|utl_http)", 'action': 'block', 'severity': 'critical', 'enabled': True},
            {'name': 'XSS - Data URI', 'pattern': r'(?i)(data\s*:\s*text\/html)', 'action': 'block', 'severity': 'high', 'enabled': True},
            {'name': 'Path Traversal - Encoded', 'pattern': r'(%2e%2e%2f|%2e%2e\/|%252e%252e)', 'action': 'block', 'severity': 'high', 'enabled': True},
        ]

    def _load_rules(self):
        defaults = self._get_default_rules()
        try:
            db = self._get_db()
            stored = list(db.rules.find().sort('sort_order', 1))
            if stored:
                self.default_rules = []
                for r in stored:
                    rule = {k: v for k, v in r.items() if k not in ('_id', 'sort_order')}
                    self.default_rules.append(rule)
                _log.info("Loaded %d rules from database", len(self.default_rules))
            else:
                self.default_rules = defaults
                self._persist_rules()
                _log.info("Initialized %d default rules", len(self.default_rules))
        except Exception as e:
            _log.warning("Failed to load rules from DB, using defaults: %s", e)
            self.default_rules = defaults

    def _persist_rules(self):
        try:
            db = self._get_db()
            db.rules.delete_many({})
            for i, rule in enumerate(self.default_rules):
                to_save = {k: v for k, v in rule.items()}
                to_save['sort_order'] = i
                db.rules.insert_one(to_save)
        except Exception as e:
            _log.warning("Failed to persist rules: %s", e)

    def check_rules(self, request_data, rules=None):
        if rules is None:
            rules = self.default_rules
        matches = []
        url = request_data.get('url', '')
        body = request_data.get('body', '')
        query_string = request_data.get('query_string', '')
        query_params = request_data.get('query_params', {})
        query_values = ' '.join(str(v) for v in query_params.values()) if isinstance(query_params, dict) else ''
        body_fields = request_data.get('body_fields', {})
        body_field_values = request_data.get('body_field_values', '')
        parts = [p for p in [url, body, query_string, query_values, body_field_values] if p.strip()]
        combined = ' '.join(parts) if parts else url
        try:
            combined = urllib.parse.unquote(combined)
            combined = urllib.parse.unquote(combined)
        except Exception:
            pass
        for rule in rules:
            if not rule.get('enabled', True):
                continue
            try:
                if re.search(rule['pattern'], combined):
                    matches.append({
                        'rule_name': rule['name'],
                        'pattern': rule['pattern'],
                        'action': rule['action'],
                        'severity': rule['severity'],
                        'matched_at': datetime.now()
                    })
            except re.error:
                continue
        if body_fields:
            field_combined = ' '.join(str(v) for v in body_fields.values())
            try:
                field_combined = urllib.parse.unquote(field_combined)
                field_combined = urllib.parse.unquote(field_combined)
            except Exception:
                pass
            for rule in rules:
                if not rule.get('enabled', True):
                    continue
                try:
                    if re.search(rule['pattern'], field_combined):
                        already_matched = any(m['rule_name'] == rule['name'] for m in matches)
                        if not already_matched:
                            matches.append({
                                'rule_name': rule['name'],
                                'pattern': rule['pattern'],
                                'action': rule['action'],
                                'severity': rule['severity'],
                                'matched_at': datetime.now()
                            })
                except re.error:
                    continue
        return matches

    def add_rule(self, rule):
        rule['enabled'] = True
        rule['created_at'] = datetime.now()
        self.default_rules.append(rule)
        self._persist_rules()
        return rule

    def update_rule(self, index, rule_data):
        if 0 <= index < len(self.default_rules):
            self.default_rules[index].update(rule_data)
            self._persist_rules()
            return self.default_rules[index]
        return None

    def delete_rule(self, index):
        if 0 <= index < len(self.default_rules):
            rule = self.default_rules.pop(index)
            self._persist_rules()
            return rule
        return None
