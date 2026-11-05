<?php
/**
 * MDefender-Pro Rule Engine & Threat Pattern Matcher
 *
 * Evaluates inbound HTTP traffic against:
 * 1. Default Hardened WAAP Rule Set (SQLi, XSS, LFI, RFI, Command Injection, SSRF, SSTI)
 * 2. Next-Gen Rules (AI Prompt Injection, Prototype Pollution, Log4j/JNDI)
 * 3. Semantic Grammar Tokenizer (Libinjection-style intent detection)
 * 4. User-Defined Custom DB Rules
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

class WAF_FW_Rule_Engine {
    private static $_instance = null;
    private $default_rules;
    private $rules_from_db;
    private $deobfuscator;
    private $cached_rules = null;

    public static function instance() {
        if (null === self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->default_rules = $this->get_default_rules();
        $this->rules_from_db = $this->load_rules_from_db();
        if (class_exists('WAF_FW_Semantic_Deobfuscator')) {
            $this->deobfuscator = WAF_FW_Semantic_Deobfuscator::instance();
        }
    }

    private function get_default_rules() {
        return [
            // 1. SQL Injection & 2026 Evasion Ladders
            ['name' => 'SQL Injection - Union Select', 'pattern' => '/(?:\bUNION\b[\s\t%09\/\*]+(?:\bALL\b[\s\t%09\/\*]+)?\bSELECT\b)|\bUNION\b[\s\S]{0,40}\bSELECT\b|\/\*!\d*select\b|\/\*!\d*union\b/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Drop Table', 'pattern' => '/(?:\bDROP\b\s+\bTABLE\b)|(?:\bTRUNCATE\b\s+\bTABLE\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Boolean Tautology', 'pattern' => '/(?:\b(?:OR|AND)\b[\s\t\r\n%09%0a\/\*]+[\'"]?\w+[\'"]?[\s\t\r\n%09%0a\/\*]*=[\s\t\r\n%09%0a\/\*]*[\'"]?\w+[\'"]?)|(?:\b(?:OR|AND)\b[\s\t\r\n%09%0a\/\*]+1[\s\t\r\n%09%0a\/\*]*=[\s\t\r\n%09%0a\/\*]*1\b)|(?:\b(?:OR|AND)\b[\s\t\r\n%09%0a\/\*]+[\'"]1[\'"][\s\t\r\n%09%0a\/\*]*=[\s\t\r\n%09%0a\/\*]*[\'"]1[\'"])/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Single Quote Escape', 'pattern' => '/(?:%27|\')[\s\t\r\n%09%0a\/\*]*(?:--|#|\/\*|\bOR\b|\bAND\b|\bUNION\b|;)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'SQL Injection - Blind Sleep / Benchmark', 'pattern' => '/(?:\b(?:SLEEP|BENCHMARK|WAITFOR\s+DELAY|PG_SLEEP|LOAD_FILE|INTO\s+OUTFILE|SCHEMA_NAME)\s*\()/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Stacked & OOB Queries', 'pattern' => '/(?:;[\s\t\r\n%09%0a\/\*]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|WAITFOR|EXEC|EXECUTE)\b)|(?:LOAD_FILE\s*\([\s\S]{0,60}\\\\)|(?:EXEC\s+(?:master\.\.)?xp_cmdshell)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Clauses & Ordering', 'pattern' => '/(?:\bHAVING\b[\s\t%09\/\*]+(?:\d+=\d+|1=1|[\'"]\w+[\'"]=[\'"]\w+[\'"]))|(?:\bORDER\b[\s\t%09\/\*]+\bBY\b[\s\t%09\/\*]+\d+[\s\t%09\/\*]*(?:--|#|\/\*|;)?)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SQL Injection - Escape and Comments', 'pattern' => '/(?:[\'"][\\)\]\}]{0,4}[\s\t%09\/\*]*(?:--|#|\/\*|;))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            // 2. Cross-Site Scripting (XSS 2026 Suite)
            ['name' => 'XSS - Script Tag', 'pattern' => '/(?:<[\/s]*script[\s\S]*?>[\s\S]*?<\/[\/s]*script>)|(?:<[\/s]*script[\s\S]*?>)|(?:<scr<script>ipt>)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'XSS - SVG Vectors & Context Breaking', 'pattern' => '/<svg[\s\S]*?(?:onload|onerror|onfocus|onmouseover|onmouseenter|xlink:href\s*=)[\s\S]*?>|[\x27\x22]>\s*<(?:script|svg)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'XSS - Event Handlers', 'pattern' => '/(?:\bon[a-z]{3,15}[\s\t%09\/\*]*=[\s\t%09\/\*]*[\'"]?[^\'">]+)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - JavaScript Protocol', 'pattern' => '/(?:javascript\s*:\s*[^\s\'"]+|data:text\/html)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Alert / Execution Functions', 'pattern' => '/(?:alert|prompt|confirm)\s*(?:\([^\)]*\)|`[^`]*`)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Malicious Tags', 'pattern' => '/<(?:iframe|object|embed|applet|meta\s+http-equiv)[^>]*>|<(?:svg|img|body|input|link)[^>]+(?:onload|onerror|src\s*=\s*[\'"]?javascript|data:text\/html)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - DOM Clobbering & Framework Matrix', 'pattern' => '/(?:\{\{constructor\.constructor\([^)]+\)\(\)\}\}|<form[^>]+id\s*=\s*[\x27\x22]?config[\x27\x22]?|<a[^>]+id\s*=\s*[\x27\x22]?testobject[\x27\x22]?)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'XSS - Exfiltration & Context Hijacking', 'pattern' => '/(?:document\.(?:cookie|location|domain)|window\.(?:localStorage|sessionStorage|location)|\blocation\.(?:href|replace|assign)\s*=|fetch\s*\(\s*[\'"]https?:\/\/|btoa\s*\(\s*document\.)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            ['name' => 'XSS - Frontend SPA Directives', 'pattern' => '/(?:\bv-html\s*=|\bng-bind-html\s*=|\bdangerouslySetInnerHTML\b)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],

            // 3. Local & Remote File Inclusion & Sensitive Path Protection
            ['name' => 'LFI - Directory Traversal', 'pattern' => '#(?:\.{2,}[\/\\\\;])|(?:[\/\\\\;]\.{2,})#i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'LFI - Sensitive Files', 'pattern' => '#(?:\/etc\/(?:passwd|shadow|hosts|group|issue))|(?:c:[\/\\\\]windows[\/\\\\]win\.ini)#i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'LFI - PHP Wrappers', 'pattern' => '/(?:php:\/\/(?:filter|input|memory|data)|data:\/\/text\/plain|file:\/\/)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Hidden Directory & Dotfile Probe', 'pattern' => '/(?:\/\.(?!well-known(?:[\/?#]|$))[\w\.-]+)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Sensitive System & Config File Probe', 'pattern' => '/(?:\bwp-config\.php(?:\.(?:bak|old|save|swp|dist|orig|inc|txt|backup|temp|\d+)|~)?\b|\bweb\.config\b|\.htaccess\b|\.htpasswd\b|\.user\.ini\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Database Backup & SQL Dump Probe', 'pattern' => '/(?:\b(?:backup|dump|database|db|users|wordpress|site|mysql|export|schema|data|tables)(?:_\d+)?\.(?:sql|sql\.gz|tar\.gz|tgz|zip|bak)\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Information Disclosure & Dotfile Probes', 'pattern' => '#(?:^|[\s\t\/=\'\"`])(?:\.env|\.aws|\.kube|\.git|\.svn|\.ssh|\.bash_history|\.debug|__debug|actuator\b)|apache2\.conf|error\.log|mysql-bin\.log|iis6\.log#i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            // 4. Remote Command Execution & Reverse Shells
            ['name' => 'Remote Code Execution - PHP Functions', 'pattern' => '/(?:\b(?:system|exec|shell_exec|passthru|popen|proc_open|eval|assert|base64_decode|gzinflate|create_function)\s*[\(\[])/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - Backticks and Subshells', 'pattern' => '/(?:`[^`]+`|\$\([^\)]+\))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - Reverse Shells & Netcat', 'pattern' => '/(?:\b(?:bash\s+-i|dev\/tcp\/|nc\s+-e|powershell\s+-(?:enc|nop|c|ep|e)|curl\s+[^\s|]+\s*\|\s*(?:bash|sh))\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Reverse Shell - Multi-Language Network Connectors', 'pattern' => '/(?:\b(?:python\d*|perl|ruby|lua|awk|php)\s+-(?:[a-zA-Z]*[cMe])\s*[\'"][\s\S]{0,100}?(?:socket|pty\.spawn|TCPSocket|inet\/tcp|\/bin\/sh|\/bin\/bash|exec|system)|(?:nc|ncat|socat|netcat)\b[\s\S]{0,30}?(?:-[a-zA-Z]*e\b|-c\s+bash|\/bin\/sh|\/bin\/bash|\d{2,5}\s+-e)|(?:mkfifo\s+[\/\w]+|dev\/tcp\/|dev\/udp\/|inet\/tcp\/|TCPSocket\.open|Runtime\.getRuntime\(\)|p\.waitFor\(\)))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Privilege Escalation & Tool Execution', 'pattern' => '/(?:\b(?:linpeas\.sh|winpeas|chisel|mimikatz|pspy|socat)\b|(?:\/bin\/bash\s+-p|\/bin\/sh\s+-i|sudo\s+-(?:l|u\s+root)|whoami|id[\s;\|&`]|uname\s+-a)\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'WebShell & PHP Stagers', 'pattern' => '/(?:\b(?:fsockopen|proc_open|popen)\s*\([\s\S]{0,50}?(?:\$ip|\$port|\/bin\/sh|\/bin\/bash|cmd\.exe)|\$shell\s*=\s*[\'"][^\'"]*?(?:id|whoami|\/bin\/sh)|<\?(?:php|=)[\s\S]{0,60}?(?:system|exec|passthru|shell_exec|eval|assert)\s*\(\s*\$_(?:GET|POST|REQUEST))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - Pipes and Chaining', 'pattern' => "/(?:(?:\|\||\||&&|;|\$|\$\()\s*(?:(?:\/usr)?\/bin\/)?(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell|timeout|sleep|ping)\b(?!\=)(?:\s+[\w\-\.\/]+)?)|(?:\b(?:cat|ls|dir|whoami|id|uname|ps|wget|curl|nc|bash|sh|python|perl|ruby|php|cmd|powershell|timeout|sleep|ping)\b(?!\=)\s*(?:\|\||\||&&|;))/i", 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - Semicolon System Commands', 'pattern' => '/(?:(?:;|&&|\|\||\||\$|\$\()\s*(?:(?:\/usr)?\/bin\/)?(?:ls|cat|id|whoami|ping|sleep|timeout|nc|bash|sh|cmd|powershell)\b(?!\=))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            ['name' => 'Command Injection - Newline and Execution Delimiters', 'pattern' => '/(?:(?:^|[\r\n%0a`])\s*(?:(?:\/usr)?\/bin\/)?(?:cat|ls|id|whoami|ping|sleep|timeout|nc|bash|sh)\s+(?:\d+|[\/\w\-\.]+))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            // 8. Framework RCE & Modern Container/JVM Exploitation
            ['name' => 'Framework RCE - Spring4Shell & ClassLoader', 'pattern' => '/(?:\bclass\.classLoader\b|\bclassLoader\b|\.URLs\[|\.pipeline\.first)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Framework RCE - Apache Solr & Struts OGNL', 'pattern' => '/(?:%\{[^\}]*\}|\/solr\/(?:admin|update)|\/cores\?action=|\bmakeRO\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Privilege Escalation - Container Escape & Audit Tools', 'pattern' => '/(?:\b(?:docker\s+run|chroot\s+\/|sudoedit|getcap\s+-r|pwnkit|pspy\d*|lse\.sh|linpeas|winpeas)\b|\bfind\s+[^\s]+\s+-perm\s+-[0-9a-z]+|\bfind\s+[^\s]+\s+-u=s)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Dynamic PHP Variable Function Execution', 'pattern' => '/(?:\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\(\s*\$[a-zA-Z_\x7f-\xff])/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Host Header Injection Vector', 'pattern' => '/(?:(?:^|[\r\n%0a%0d\s])Host\s*:\s*[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,})/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Command Injection - Isolated System Command', 'pattern' => '#(?:(?:(?:^|[\r\n;&|`\$\(\!])\s*(?:(?:\/usr)?\/bin\/)?(?:id|whoami|uname)\b(?:\s*[\r\n;&|`\$\)\!]|\s+[\w\-\.\/]+|\s*$)))|(?:\/(?:usr\/)?bin\/(?:id|whoami|uname)\b)#i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            // 5. Server-Side Request Forgery & Template Injection
            ['name' => 'Path Traversal - Sensitive Files', 'pattern' => '#(?:\/(?:etc\/(?:passwd|shadow|issue|hosts|group)|var\/log\/|proc\/self\/environ|windows[\/\\\\]win\.ini)\b)#i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSTI - Multi-Engine Template Injection', 'pattern' => '/(?:\{\{[^}]*\}\}|\$\{[^}]*\}|<%=[^%]*%>|#set\s*\([^\)]+\)|<#assign|\$\{\.vars|\$\{[^}]*freemarker|java\.lang\.Runtime|Runtime\.getRuntime\(\)|@\{\s*ViewData)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSTI - Python Internals', 'pattern' => '/(?:__class__|__mro__|__subclasses__|__builtins__)/', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Cloud Metadata & Internal Endpoints', 'pattern' => '/(?:169\.254\.169\.254|metadata\.google\.internal|\/latest\/meta-data|\/computeMetadata)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF & Out-of-Band Collaborator Probes', 'pattern' => '/(?:(?:burpcollaborator\.net|oastify\.com|canarytokens\.com|interact\.sh|requestcatcher\.com)\b|169\.254\.169\.254|metadata\.google\.internal|\/latest\/meta-data|X-aws-ec2-metadata-token)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Encoded & IPv6 Loopback', 'pattern' => '/(?:\[::ffff:127\.0\.0\.1\]|\[::1\]|2130706433|0177\.0\.0\.1|0x7f000001|\b(?:gopher|dict):\/\/)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'SSRF - Private Subnets', 'pattern' => '/(?:(?:https?|ftp):\/\/.*(?:169\.254\.|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            // 6. Next-Gen Modern Attack Vectors & Deserialization
            ['name' => 'AI Security - Prompt Injection', 'pattern' => '/(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s*:\s*you\s+are\s+now|you\s+are\s+DAN\b)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Prototype Pollution Attack', 'pattern' => '/(?:__proto__|constructor\s*\[\s*[\'"]?prototype[\'"]?\s*\]|prototype\s*\[\s*[\'"]?\w+[\'"]?\s*\]|constructor\.prototype)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Insecure Deserialization Suite', 'pattern' => '/(?:\bO:\d+:"[^"]+":\d+:\{|\$phar->|Phar::|rO0AB[a-zA-Z0-9+\/]{4,}|\bCakePHP\/RCE|\bYsoSerial\b)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'JNDI / Log4j Injection Probe', 'pattern' => '/(?:\$\{\s*(?:jndi|ldap|rmi|dns)\s*:[^\}]+\})/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'GraphQL Introspection Abuse', 'pattern' => '/(?:__schema\s*\{|__type\s*\(\s*name\s*:)/i', 'action' => 'block', 'severity' => 'medium', 'enabled' => true],
            ['name' => 'NoSQL Injection Extended', 'pattern' => '/(?:\[(?:[$]|%24)(?:ne|gt|gte|lt|lte|regex|exists|where|nin|in|or|and)\])|(?:[\'\"\s](?:[$]|%24|%2524)(?:ne|gt|gte|lt|lte|regex|exists|where|nin|in|or|and)[\'\"\s]*:)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'XML External Entity (XXE) Suite', 'pattern' => '/(?:<!ENTITY[\s%]+\w+[\s\S]{0,40}?(?:SYSTEM|PUBLIC)\s+[\'"][^\'"]+[\'"]|<!DOCTYPE\s*\w*\s*\[|&lol\d+;|<!ENTITY%)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'XPath Injection', 'pattern' => '/(?:\b(?:count|string|contains|position|local-name|name)\s*\(\s*\/\/*)|(?<!:)(?:\/\/[a-zA-Z0-9_\*]+\[[^\]]+\])|(?:\/\/\*)|(?:[\'"][\s\t\r\n]*(?:or|and)[\s\t\r\n]*[\'"]?\w*[\'"]?\s*=\s*[\'"]?\w*[\'"]?\s*(?:--|\/\*|or\s+[\'"]\w+[\'"]=[\'"]\w+[\'"]))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'LDAP Injection', 'pattern' => '#(?:\(\s*[&|!]\s*\([a-zA-Z0-9_-]+[\*=\)])|(?:\*\)\s*\([a-zA-Z0-9_-]+=)|(?:\(%00|\(%2500)|(?:[\x00\s]*\)\s*\(&)#i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'JWT None Algorithm & Tampering', 'pattern' => '/(?:eyJhbGciOiJub25lIiw|"alg"\s*:\s*"none")/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],

            // 7. Request Smuggling, Cache Poisoning, Host Injection & Evasions
            ['name' => 'Host Header Injection', 'pattern' => '/(?:Host:\s*[^\s\r\n]+@[^\r\n]*|[?&]Host=[^\r\n]*|Host:\s*[^\s\r\n:]+:[^\s\r\n:]+:[^\s\r\n:]+)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'HTTP Smuggling & Cache Poisoning', 'pattern' => '/(?::(?:method|path|authority|scheme):\s*\w+|%0d%0a\s*(?:Transfer-Encoding|Content-Length|Host|Set-Cookie):|\bTransfer-Encoding\s*:\s*chunked|\b(?:X-Forwarded-Host|X-Host|X-Original-URL)\s*:\s*[\w\.-]+\.(?:com|net|org|io|net|xyz|burp)|Forwarded:\s*for=[^;]+;host=)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'CORS Misconfiguration Origin Spoof', 'pattern' => '/\bOrigin:\s*null\b/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Open Redirect Protection', 'pattern' => '#(?:(?:^|[\s?&])(?:redirect(?:_to)?|return(?:_to)?|url|dest|next|target|goto|link|visit|r)=)(?:(?:\/{2,}|[\/\\\\]{2,})(?!localhost|127\.0\.0\.1)[a-zA-Z0-9\.\-]+|https?:[\/\\\\]{2,}(?!localhost|127\.0\.0\.1)[^\/\s]+|%0d%0aLocation:)#i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Automated Vulnerability Scanner', 'pattern' => '/\b(?:sqlmap|nikto|acunetix|nuclei|wpscan|gobuster|dirbuster|ffuf|nmap|masscan|zgrab|nessus|openvas|hydra|medusa)\b/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'WAF Bypass Wildcard & Encoded Execution', 'pattern' => '/(?:\/\?{2,}\/[a-z\?]+)|(?:%0a\s*(?:id|whoami|cat|ls|dir|\/bin\/))/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'File Upload Double Extension & Null Byte', 'pattern' => '/(?:\.(?:php\d*|phtml|phar)\.(?:jpg|png|gif|pdf|txt|zip)|\.(?:php\d*|phtml|phar)%00)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'User Enumeration Probe', 'pattern' => '/(?:\/wp-json\/wp\/v2\/users\b|[?&]author=\d+)/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Hosting Control Panel Probe', 'pattern' => '/(?:^|[?&])(?:cpanel|whm|webmail)=\d*|:(?:2082|2083|2086|2087)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
            ['name' => 'Double URL Encoded Injection', 'pattern' => '/(?:%25(?:27|22|3d|20|3c|3e))/i', 'action' => 'block', 'severity' => 'high', 'enabled' => true],
            ['name' => 'Application Logic Cart Tampering', 'pattern' => '/(?:[?&](?:price|amount|total)=-\d+|"price"\s*:\s*-\d+|"discount_override"\s*:\s*100)/i', 'action' => 'block', 'severity' => 'critical', 'enabled' => true],
        ];
    }

    private function load_rules_from_db() {
        global $wpdb;
        if (!$wpdb || !isset($wpdb->prefix)) {
            return [];
        }
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $db_rules = $wpdb->get_results("SELECT * FROM $table WHERE enabled = 1");
        if (!$db_rules) return [];
        return $db_rules;
    }

    public function check_request($data) {
        $matches = [];
        $combined = $data['url'] ?? '';

        if (!empty($data['body'])) {
            $combined .= ' ' . $data['body'];
        }
        if (!empty($data['post_params']) && is_array($data['post_params'])) {
            $combined .= ' ' . $this->flatten_values($data['post_params']);
        }
        if (!empty($data['cookies']) && is_array($data['cookies'])) {
            $combined .= ' ' . $this->flatten_values($data['cookies']);
        }
        if (!empty($data['query_string'])) {
            $combined .= ' ' . $data['query_string'];
        }
        if (!empty($data['query_params']) && is_array($data['query_params'])) {
            $combined .= ' ' . $this->flatten_values($data['query_params']);
        }
        if (!empty($data['user_agent'])) {
            $combined .= ' User-Agent: ' . $data['user_agent'];
        }
                                // Inspect custom headers and cookies for Burp Suite & API tampering
        if (!empty($data['headers']) && is_array($data['headers'])) {
            $safe_header_keys = [
                'host', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
                'accept', 'accept-language', 'accept-encoding', 'connection',
                'upgrade-insecure-requests', 'sec-fetch-dest',
                'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user', 'priority',
                'content-length', 'if-none-match', 'if-modified-since',
                'cache-control', 'pragma', 'dnt'
            ];
            $inspect_headers = [];
            foreach ($data['headers'] as $k => $v) {
                $lower_k = strtolower((string)$k);
                if (in_array($lower_k, $safe_header_keys, true)) {
                    continue;
                }
                $inspect_headers[] = (string)$k . ": " . (string)$v;
            }
            if (!empty($inspect_headers)) {
                $combined .= "\r\n" . implode("\r\n", $inspect_headers);
            }
        }

        // Multi-Pass Recursive De-obfuscation (Only executed ONCE)
        $normalized = $combined;
        if ($this->deobfuscator) {
            $normalized = $this->deobfuscator->deobfuscate($combined);

            // 1. Semantic Intent Tokenizer Analysis (Libinjection AST)
            $sql_intent = $this->deobfuscator->analyze_sql_intent($normalized, true);
            if ($sql_intent['is_sqli']) {
                return [[
                    'rule_name' => 'Semantic WAAP: ' . $sql_intent['type'],
                    'pattern' => 'LIBINJECTION_AST_PARSER',
                    'action' => 'block',
                    'severity' => 'critical',
                ]];
            }

            $xss_intent = $this->deobfuscator->analyze_xss_intent($normalized, true);
            if ($xss_intent['is_xss']) {
                return [[
                    'rule_name' => 'Semantic WAAP: ' . $xss_intent['type'],
                    'pattern' => 'XSS_CONTEXT_PARSER',
                    'action' => 'block',
                    'severity' => 'critical',
                ]];
            }

            $ai_intent = $this->deobfuscator->analyze_ai_prompt_injection($normalized, true);
            if ($ai_intent['is_injection']) {
                return [[
                    'rule_name' => 'Semantic WAAP: ' . $ai_intent['type'],
                    'pattern' => 'AI_JAILBREAK_DETECTOR',
                    'action' => 'block',
                    'severity' => 'high',
                ]];
            }
        }

        // Exhaustive rule evaluation across normalized and decoded request streams

        // Pattern matching on both normalized text and raw URL decoded input
        $raw_decoded = urldecode(urldecode($combined));
        $all_rules = $this->convert_db_rules();

        foreach ($all_rules as $rule) {
            if (!$rule['enabled']) continue;
            if (@preg_match($rule['pattern'], $normalized) || @preg_match($rule['pattern'], $raw_decoded)) {
                $matches[] = [
                    'rule_name' => $rule['name'],
                    'pattern' => $rule['pattern'],
                    'action' => $rule['action'],
                    'severity' => $rule['severity'],
                ];
                // Early exit on first blocking rule
                if ($rule['action'] === 'block') {
                    return $matches;
                }
            }
        }
        return $matches;
    }

    private function convert_db_rules() {
        if ($this->cached_rules !== null) {
            return $this->cached_rules;
        }

        $rules = [];
        foreach ($this->default_rules as $i => $rule) {
            $rules['default_' . $i] = $rule;
        }

        // Merge Cloud Central Virtual Patches
        $cloud_rules = get_option('waf_fw_cloud_rules_cache', []);
        if (is_array($cloud_rules) && !empty($cloud_rules)) {
            foreach ($cloud_rules as $idx => $c_rule) {
                if (is_array($c_rule) && !empty($c_rule['pattern'])) {
                    $rules['cloud_' . ($c_rule['id'] ?? $idx)] = [
                        'name' => $c_rule['name'] ?? ('Cloud Virtual Patch #' . $idx),
                        'pattern' => $c_rule['pattern'],
                        'action' => $c_rule['action'] ?? 'block',
                        'severity' => $c_rule['severity'] ?? 'critical',
                        'enabled' => !isset($c_rule['enabled']) || $c_rule['enabled'],
                    ];
                }
            }
        }

        if (!empty($this->rules_from_db)) {
            foreach ($this->rules_from_db as $db_rule) {
                $rules['db_' . $db_rule->id] = [
                    'name' => $db_rule->name,
                    'pattern' => $db_rule->pattern,
                    'action' => $db_rule->action,
                    'severity' => $db_rule->severity,
                    'enabled' => (bool) $db_rule->enabled,
                ];
            }
        }
        $this->cached_rules = $rules;
        return $this->cached_rules;
    }

    public function get_rules() {
        $rules = [];
        $i = 0;
        foreach ($this->default_rules as $rule) {
            $rules[] = array_merge($rule, ['id' => $i, 'source' => 'default']);
            $i++;
        }
        if (!empty($this->rules_from_db)) {
            foreach ($this->rules_from_db as $db_rule) {
                $rules[] = [
                    'id' => 'db_' . $db_rule->id,
                    'name' => $db_rule->name,
                    'pattern' => $db_rule->pattern,
                    'action' => $db_rule->action,
                    'severity' => $db_rule->severity,
                    'enabled' => (bool) $db_rule->enabled,
                    'source' => 'database',
                ];
            }
        }
        return $rules;
    }

    public function add_rule($rule) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $wpdb->insert($table, [
            'name' => $rule['name'],
            'pattern' => $rule['pattern'],
            'action' => $rule['action'] ?? 'block',
            'severity' => $rule['severity'] ?? 'high',
            'enabled' => 1,
        ]);
        $this->rules_from_db = $this->load_rules_from_db();
        return ['id' => $wpdb->insert_id, 'source' => 'database'];
    }

    public function update_rule($id, $data) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $update = [];
        if (isset($data['name'])) $update['name'] = $data['name'];
        if (isset($data['pattern'])) $update['pattern'] = $data['pattern'];
        if (isset($data['action'])) $update['action'] = $data['action'];
        if (isset($data['severity'])) $update['severity'] = $data['severity'];
        if (isset($data['enabled'])) $update['enabled'] = $data['enabled'] ? 1 : 0;

        $db_id = str_replace('db_', '', $id);
        $wpdb->update($table, $update, ['id' => $db_id]);
        $this->rules_from_db = $this->load_rules_from_db();
        return true;
    }

    public function delete_rule($id) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $db_id = str_replace('db_', '', $id);
        $wpdb->delete($table, ['id' => $db_id]);
        $this->rules_from_db = $this->load_rules_from_db();
        return true;
    }

    public function toggle_rule($id) {
        global $wpdb;
        $table = $wpdb->prefix . WAF_FW_TABLE_FIREWALL_RULES;
        $db_id = str_replace('db_', '', $id);
        $rule = $wpdb->get_row($wpdb->prepare("SELECT enabled FROM $table WHERE id = %d", $db_id));
        if ($rule) {
            $new_val = $rule->enabled ? 0 : 1;
            $wpdb->update($table, ['enabled' => $new_val], ['id' => $db_id]);
            $this->rules_from_db = $this->load_rules_from_db();
            return $new_val;
        }
        return false;
    }

    public function flatten_values($arr, $depth = 0) {
        if ($depth > 8 || !is_array($arr)) return is_scalar($arr) ? (string)$arr : '';
        $out = [];
        foreach ($arr as $k => $v) {
            if (is_array($v)) {
                $out[] = $this->flatten_values($v, $depth + 1);
            } elseif (is_scalar($v)) {
                $out[] = is_string($k) ? "{$k}={$v}" : (string)$v;
            }
        }
        return implode(' ', $out);
    }
}
