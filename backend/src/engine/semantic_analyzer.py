"""MDefender Pro Semantic AST & Lexical Analyzers (WAF 3.0).

Provides deep grammar, tokenization, and context-aware vulnerability inspection:
- SQLSemanticLexer: Evaluates SQL token sequence grammar & tautologies
- XSSContextLexer: Evaluates DOM contexts, HTML event handlers & script sinks
- SSRFShield: Detects cloud metadata endpoints, internal IPv4/IPv6 & obfuscated IP representations
- PromptInjectionShield: Detects LLM jailbreaks, system extraction, and instruction overrides
- RCELexer: Detects command chaining, shell metacharacters, and obfuscated binaries
"""

import ipaddress
import re
import urllib.parse
from typing import Dict, List, Optional, Tuple


class SQLSemanticLexer:
    """Evaluates lexical tokens to identify SQL injection grammar with near-zero false positives."""

    SQL_KEYWORDS = {
        "SELECT", "UNION", "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
        "TRUNCATE", "EXEC", "EXECUTE", "DECLARE", "FROM", "WHERE", "HAVING", "GROUP",
        "ORDER", "BY", "LIMIT", "OFFSET", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER",
        "AND", "OR", "XOR", "NOT", "LIKE", "ILIKE", "REGEXP", "RLIKE", "IN", "IS",
        "NULL", "TRUE", "FALSE", "CASE", "WHEN", "THEN", "ELSE", "END", "WAITFOR",
        "DELAY", "SLEEP", "BENCHMARK", "PG_SLEEP", "LOAD_FILE", "INTO", "OUTFILE",
        "DUMPFILE", "INFORMATION_SCHEMA", "SYS", "VERSION", "USER", "DATABASE", "SCHEMA"
    }

    SQL_FUNCTIONS = {
        "SLEEP", "BENCHMARK", "PG_SLEEP", "VERSION", "USER", "CURRENT_USER", "DATABASE",
        "SCHEMA", "CONCAT", "CONCAT_WS", "CHAR", "CHR", "ASCII", "HEX", "UNHEX",
        "SUBSTRING", "SUBSTR", "MID", "MD5", "SHA1", "COALESCE", "EXTRACTVALUE",
        "UPDATEXML", "ST_LATFROMGEOHASH", "GTID_SUBSET", "JSON_KEYS"
    }

    def analyze(self, text: str) -> Dict[str, any]:
        if not text or len(text.strip()) < 3:
            return {"is_sqli": False, "score": 0.0, "reasons": []}

        reasons = []
        score = 0.0
        upper_text = text.upper()

        # 1. Check for UNION-based injection grammar (UNION [ALL] SELECT)
        if re.search(r"\bUNION\s+(?:ALL\s+)?SELECT\b", upper_text):
            reasons.append("UNION-based data exfiltration grammar")
            score = max(score, 0.98)

        # 2. Check for boolean tautologies (' OR '1'='1', 1 OR 1=1, ' OR 'a'='a', ' OR ''=')
        if re.search(r"(?:'|\"|\b)\s*(?:OR|XOR|AND)\s+['\"`]?([a-zA-Z0-9_-]+)['\"`]?\s*=\s*['\"`]?\1['\"`]?", upper_text):
            reasons.append("Boolean tautology bypass (OR 1=1 / 'a'='a')")
            score = max(score, 0.95)

        # 3. Check for tautologies with inequality or ALWAYS-TRUE operators
        if re.search(r"(?:'|\"|\b)\s*(?:OR|AND)\s+(?:TRUE|1=1|2>1|0=0|'1'='1'|\"1\"=\"1\")\b", upper_text):
            reasons.append("Static boolean tautology evaluation")
            score = max(score, 0.92)

        # 4. Check for time-based blind injection functions
        if re.search(r"\b(?:SLEEP|PG_SLEEP|BENCHMARK|WAITFOR\s+DELAY)\s*\(\s*['\"]?\d+", upper_text):
            reasons.append("Time-based blind SQLi function invocation")
            score = max(score, 0.95)

        # 5. Check for stacked query terminations (; DROP TABLE, ; EXEC xp_cmdshell)
        if re.search(r";\s*(?:DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE|EXEC|EXECUTE)\s+\b", upper_text):
            reasons.append("Stacked destructive SQL statement execution")
            score = max(score, 0.97)

        # 6. Check for information schema extraction
        if re.search(r"\bFROM\s+INFORMATION_SCHEMA\.(?:TABLES|COLUMNS|SCHEMATA|USER_PRIVILEGES)\b", upper_text):
            reasons.append("Database metadata & schema enumeration")
            score = max(score, 0.96)

        # 7. Check for out-of-band file I/O
        if re.search(r"\b(?:LOAD_FILE|INTO\s+(?:OUTFILE|DUMPFILE))\s*\(?", upper_text):
            reasons.append("Direct database filesystem read/write operation")
            score = max(score, 0.98)

        # 8. Check for SQL comment terminations with trailing injection
        if re.search(r"(?:'|\")\s*(?:OR|AND)\s+[^\r\n]+(?:--|#|/\*)", upper_text):
            reasons.append("Comment-terminated SQL conditional injection")
            score = max(score, 0.90)

        # 9. Token frequency evaluation for unquoted SQL keywords density
        words = re.findall(r"\b[A-Z_]+\b", upper_text)
        sql_matches = [w for w in words if w in self.SQL_KEYWORDS]
        if len(sql_matches) >= 3 and any(w in ("SELECT", "FROM", "WHERE", "UNION") for w in sql_matches):
            if score < 0.85:
                reasons.append(f"High density SQL grammar fragment: {', '.join(sql_matches[:4])}")
                score = max(score, 0.85)

        return {
            "is_sqli": score >= 0.70,
            "score": round(score, 2),
            "reasons": reasons
        }


class XSSContextLexer:
    """Evaluates DOM sinks, execution contexts, and HTML/JS payloads."""

    DANGEROUS_TAGS = {
        "SCRIPT", "IFRAME", "OBJECT", "EMBED", "APPLET", "SVG", "MATH", "AUDIO", "VIDEO", "BODY", "IMG", "INPUT", "LINK", "META"
    }

    EVENT_HANDLER_REGEX = re.compile(
        r"(?i)\b(onabort|onafterprint|onbeforeprint|onbeforeunload|onblur|oncanplay|oncanplaythrough|"
        r"onchange|onclick|oncontextmenu|oncopy|oncut|ondblclick|ondrag|ondragend|ondragenter|ondragleave|"
        r"ondragover|ondragstart|ondrop|ondurationchange|onemptied|onended|onerror|onfocus|onfocusin|"
        r"onfocusout|onhashchange|oninput|oninvalid|onkeydown|onkeypress|onkeyup|onload|onloadeddata|"
        r"onloadedmetadata|onloadstart|onmessage|onmousedown|onmouseenter|onmouseleave|onmousemove|"
        r"onmouseout|onmouseover|onmouseup|onmousewheel|onoffline|ononline|onpagehide|onpageshow|"
        r"onpaste|onpause|onplay|onplaying|onpopstate|onprogress|onratechange|onreset|onresize|onscroll|"
        r"onsearch|onseeked|onseeking|onselect|onstalled|onstorage|onsubmit|onsuspend|ontimeupdate|ontoggle|"
        r"ontouchcancel|ontouchend|ontouchmove|ontouchstart|onunload|onvolumechange|onwaiting|onwheel)\s*="
    )

    def analyze(self, text: str) -> Dict[str, any]:
        if not text or len(text.strip()) < 3:
            return {"is_xss": False, "score": 0.0, "reasons": []}

        reasons = []
        score = 0.0
        lower_text = text.lower()

        # 1. Explicit HTML script execution tag (<script, <iframe, <object, <embed)
        if re.search(r"<\s*(?:script|iframe|object|embed|applet|meta)\b[^>]*>", lower_text):
            reasons.append("Active HTML executable container tag (<script/iframe/object>)")
            score = max(score, 0.98)

        # 2. Inline event handler injection (<svg/onload=..., <img src=x onerror=...)
        if self.EVENT_HANDLER_REGEX.search(lower_text):
            reasons.append("Inline DOM event handler trigger (onload/onerror/onclick=)")
            score = max(score, 0.95)

        # 3. Pseudo-protocol execution schemes (javascript:, vbscript:, data:text/html)
        if re.search(r"(?i)\b(?:javascript|vbscript|data\s*:\s*text\/html)\s*:", text):
            reasons.append("Executable URI protocol scheme (javascript:/data:text/html)")
            score = max(score, 0.96)

        # 4. Dangerous JavaScript execution sink invocations
        if re.search(r"(?i)\b(?:eval|alert|prompt|confirm|Function|setTimeout|setInterval)\s*\(\s*.*?\)", text):
            # Verify if it contains dangerous references like document.cookie, window.location
            if re.search(r"(?i)document\.(?:cookie|location|domain|write)|window\.location", text):
                reasons.append("Critical JS execution sink with DOM/Cookie access")
                score = max(score, 0.98)
            else:
                reasons.append("JavaScript execution sink invocation (alert/eval/prompt)")
                score = max(score, 0.88)

        # 5. SVG / MathML CDATA or embedded scripts
        if re.search(r"<\s*(?:svg|math)\b[^>]*\/.*?>", lower_text) and ("onload" in lower_text or "onerror" in lower_text):
            reasons.append("SVG/MathML autonomous payload injection")
            score = max(score, 0.95)

        return {
            "is_xss": score >= 0.70,
            "score": round(score, 2),
            "reasons": reasons
        }


class SSRFShield:
    """Intercepts Cloud Metadata APIs, loopbacks, internal network probing, and IP obfuscation."""

    METADATA_HOSTS = {
        "169.254.169.254",            # AWS, Azure, OpenStack, DigitalOcean
        "metadata.google.internal",    # GCP
        "100.100.100.200",            # Alibaba Cloud
        "fd00:ec2::254",               # AWS IPv6 IMDS
        "instance-data",              # AWS legacy
    }

    def analyze(self, text: str) -> Dict[str, any]:
        if not text:
            return {"is_ssrf": False, "score": 0.0, "reasons": []}

        reasons = []
        score = 0.0
        lower_text = text.lower()

        # 1. Cloud Instance Metadata Service (IMDS) checks
        for host in self.METADATA_HOSTS:
            if host in lower_text:
                reasons.append(f"Cloud instance metadata access attempt ({host})")
                score = max(score, 0.99)

        # 2. Check for common cloud IMDS paths
        if any(p in lower_text for p in ["latest/meta-data", "computemetadata/v1", "metadata/instance", "openstack/latest/meta_data"]):
            reasons.append("Targeting cloud hypervisor metadata endpoint")
            score = max(score, 0.99)

        # 3. Check for IP addresses inside target URLs/payloads
        ip_candidates = re.findall(r"(?:https?|ftp|gopher|dict|ldap|file)://([0-9a-zA-Z\.:%_-]+)", lower_text)
        for host_str in ip_candidates:
            # Strip port if present
            host_only = host_str.split(":")[0].strip("[]")
            
            # Check loopback names if passed inside parameters or explicit query/body targets
            if host_only in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
                # Only flag as SSRF if it looks like a parameter target or probe, not plain benign header
                if any(k in lower_text for k in ["url=", "uri=", "target=", "dest=", "redirect=", "link=", "src=", "webhook=", "callback=", "proxy="]) or "localhost:" in lower_text or "127.0.0.1:" in lower_text:
                    # Allow standard local dev ports like 5173/5174 referers unless parameter target
                    if not any(k in lower_text for k in ["url=", "uri=", "target=", "dest=", "redirect="]):
                        continue
                    reasons.append(f"Internal loopback SSRF pivot attempt ({host_only})")
                    score = max(score, 0.95)

            # Check if candidate is an IP
            try:
                ip_obj = ipaddress.ip_address(host_only)
                if ip_obj.is_link_local:
                    reasons.append(f"Link-local cloud metadata address: {ip_obj}")
                    score = max(score, 0.99)
                elif ip_obj.is_loopback:
                    if any(k in lower_text for k in ["url=", "uri=", "target=", "dest=", "redirect=", "link=", "src=", "webhook="]):
                        reasons.append(f"Loopback IP range access: {ip_obj}")
                        score = max(score, 0.95)
                elif ip_obj.is_private:
                    if any(k in lower_text for k in ["url=", "uri=", "target=", "dest=", "redirect=", "link=", "src=", "webhook="]):
                        reasons.append(f"Private RFC 1918 subnet scanning: {ip_obj}")
                        score = max(score, 0.92)
            except ValueError:
                # Check for decimal/hex/octal encoded IP representations (e.g. 2130706433 = 127.0.0.1, 0x7f.1)
                if re.match(r"^(?:0x[0-9a-f]+|\d+)$", host_only):
                    try:
                        int_val = int(host_only, 16 if host_only.startswith("0x") else 10)
                        ip_obj = ipaddress.ip_address(int_val)
                        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                            reasons.append(f"Obfuscated numeric IP representation resolved to {ip_obj}")
                            score = max(score, 0.97)
                    except Exception:
                        pass

        # 4. Dangerous non-HTTP protocols (file://, gopher://, dict://, php://filter)
        if re.search(r"\b(?:gopher|dict|ldap|file|tftp|expect)://", lower_text):
            reasons.append("Arbitrary protocol smuggling URI (file/gopher/dict/ldap)")
            score = max(score, 0.96)

        return {
            "is_ssrf": score >= 0.70,
            "score": round(score, 2),
            "reasons": reasons
        }


class PromptInjectionShield:
    """Protects LLMs, AI agents, and GenAI backends from prompt injection and system jailbreaks."""

    JAILBREAK_PATTERNS = [
        r"(?i)ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|directions)",
        r"(?i)disregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules)",
        r"(?i)system\s+(?:override|prompt|instructions)\s*:",
        r"(?i)\byou\s+are\s+now\s+(?:unrestricted|DAN|jailbroken|an\s+evil|in\s+developer\s+mode)\b",
        r"(?i)reveal\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|hidden\s+prompt)",
        r"(?i)output\s+(?:your\s+)?(?:entire\s+prompt|initialization\s+text)",
        r"(?i)stop\s+being\s+an\s+AI\s+and\s+act\s+as",
        r"(?i)do\s+anything\s+now\s+mode",
    ]

    def analyze(self, text: str) -> Dict[str, any]:
        if not text or len(text.strip()) < 10:
            return {"is_prompt_injection": False, "score": 0.0, "reasons": []}

        reasons = []
        score = 0.0

        for pat in self.JAILBREAK_PATTERNS:
            if re.search(pat, text):
                reasons.append(f"AI Prompt Injection / Jailbreak attempt matching '{pat}'")
                score = max(score, 0.92)

        return {
            "is_prompt_injection": score >= 0.70,
            "score": round(score, 2),
            "reasons": reasons
        }


class RCELexer:
    """Evaluates shell metacharacters, command chaining, and binary execution patterns."""

    COMMANDS = {
        "cat", "head", "tail", "more", "less", "id", "whoami", "uname", "pwd", "ls", "dir",
        "wget", "curl", "nc", "netcat", "ncat", "bash", "sh", "zsh", "dash", "csh",
        "powershell", "cmd.exe", "powershell.exe", "certutil", "bitsadmin", "mshta",
        "python", "perl", "ruby", "php", "gcc", "chmod", "chown", "kill", "pkill"
    }

    def analyze(self, text: str) -> Dict[str, any]:
        if not text:
            return {"is_rce": False, "score": 0.0, "reasons": []}

        reasons = []
        score = 0.0

        # 1. Shell command chaining (; cmd, | cmd, && cmd, || cmd, `cmd`, $(cmd))
        chain_match = re.search(r"(?:;|\||\|\||&&|`|\$\()\s*([a-zA-Z0-9_\-\.\/]+)", text)
        if chain_match:
            cmd = chain_match.group(1).lower().split("/")[-1]
            if cmd in self.COMMANDS:
                reasons.append(f"Arbitrary shell command chaining execution ({cmd})")
                score = max(score, 0.98)

        # 2. Obfuscated whitespace / internal field separator (${IFS}, $IFS, $IFS$9)
        if re.search(r"(?i)\$(?:IFS|\{IFS\})", text):
            reasons.append("Shell IFS whitespace obfuscation bypass")
            score = max(score, 0.95)

        # 3. Quoted character concatenation in command execution (c'a't /e't'c/p'a's's'w'd)
        dequoted = re.sub(r"['\"]", "", text)
        if dequoted != text:
            for cmd in ["cat /etc/passwd", "cat /etc/shadow", "id", "whoami", "uname -a", "net user"]:
                if cmd in dequoted.lower() and cmd not in text.lower():
                    reasons.append(f"Quote-obfuscated shell command execution ({cmd})")
                    score = max(score, 0.96)

        # 4. Windows PowerShell / Cmd download cradles
        if re.search(r"(?i)\b(?:Invoke-Expression|IEX|DownloadString|certutil\s+-urlcache|bitsadmin\s+/transfer)\b", text):
            reasons.append("Windows living-off-the-land download cradle (IEX/certutil)")
            score = max(score, 0.98)

        return {
            "is_rce": score >= 0.70,
            "score": round(score, 2),
            "reasons": reasons
        }


class SemanticAnalyzer:
    """Unified coordinator for all semantic and AST domain analyzers."""

    def __init__(self):
        self.sql_lexer = SQLSemanticLexer()
        self.xss_lexer = XSSContextLexer()
        self.ssrf_shield = SSRFShield()
        self.prompt_shield = PromptInjectionShield()
        self.rce_lexer = RCELexer()

    def analyze_payload(self, text: str) -> Dict[str, any]:
        """Runs all semantic analyzers against a payload string and returns aggregated findings."""
        if not text:
            return {
                "highest_score": 0.0,
                "threat_categories": [],
                "reasons": [],
                "details": {}
            }

        sql_res = self.sql_lexer.analyze(text)
        xss_res = self.xss_lexer.analyze(text)
        ssrf_res = self.ssrf_shield.analyze(text)
        prompt_res = self.prompt_shield.analyze(text)
        rce_res = self.rce_lexer.analyze(text)

        threat_categories = []
        reasons = []
        scores = [0.0]

        if sql_res["is_sqli"]:
            threat_categories.append("SQL Injection")
            reasons.extend(sql_res["reasons"])
            scores.append(sql_res["score"])

        if xss_res["is_xss"]:
            threat_categories.append("Cross-Site Scripting (XSS)")
            reasons.extend(xss_res["reasons"])
            scores.append(xss_res["score"])

        if ssrf_res["is_ssrf"]:
            threat_categories.append("Server-Side Request Forgery (SSRF)")
            reasons.extend(ssrf_res["reasons"])
            scores.append(ssrf_res["score"])

        if prompt_res["is_prompt_injection"]:
            threat_categories.append("AI Prompt Injection")
            reasons.extend(prompt_res["reasons"])
            scores.append(prompt_res["score"])

        if rce_res["is_rce"]:
            threat_categories.append("Remote Command Execution (RCE)")
            reasons.extend(rce_res["reasons"])
            scores.append(rce_res["score"])

        highest_score = max(scores)

        return {
            "highest_score": highest_score,
            "threat_categories": threat_categories,
            "reasons": reasons,
            "details": {
                "sql": sql_res,
                "xss": xss_res,
                "ssrf": ssrf_res,
                "prompt_injection": prompt_res,
                "rce": rce_res,
            }
        }
