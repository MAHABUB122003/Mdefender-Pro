import os
import re

benign_dir = r'D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\data\raw\benign'
malicious_dir = r'D:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\data\raw\malicious'

patterns = {
    'eval': re.compile(r'\beval\s*\(', re.I),
    'assert': re.compile(r'\bassert\s*\(', re.I),
    'base64_decode': re.compile(r'\bbase64_decode\s*\(', re.I),
    'gzinflate': re.compile(r'\bgzinflate\s*\(', re.I),
    'str_rot13': re.compile(r'\bstr_rot13\s*\(', re.I),
    'exec_system': re.compile(r'\b(shell_exec|exec|passthru|system|proc_open|popen)\s*\(', re.I),
    'taint_eval_untrusted': re.compile(r'\beval\s*\(\s*(base64_decode|gzinflate|str_rot13|\$_(?:POST|GET|REQUEST|COOKIE|SERVER))', re.I),
    'dynamic_call_untrusted': re.compile(r'\$[a-zA-Z0-9_]+\s*\(\s*\$_(?:POST|GET|REQUEST|COOKIE)', re.I),
    'preg_replace_eval': re.compile(r'preg_replace\s*\(\s*[\'\"].*\/e[\'\"]', re.I)
}

def analyze_folder(folder_path):
    stats = {k: 0 for k in patterns}
    total = 0
    for root, _, files in os.walk(folder_path):
        for f in files:
            if f.endswith(('.php', '.phtml', '.php5', '.inc')):
                total += 1
                fp = os.path.join(root, f)
                try:
                    with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                        content = fh.read()
                        for name, pat in patterns.items():
                            if pat.search(content):
                                stats[name] += 1
                except Exception:
                    pass
    return total, stats

print('Analyzing Benign files...')
b_total, b_stats = analyze_folder(benign_dir)
print(f'Total Benign PHP files: {b_total}')
for k, v in b_stats.items():
    pct = (v / b_total * 100) if b_total else 0
    print(f'  - {k}: {v} ({pct:.2f}%)')

print('\nAnalyzing Malicious files...')
m_total, m_stats = analyze_folder(malicious_dir)
print(f'Total Malicious PHP files: {m_total}')
for k, v in m_stats.items():
    pct = (v / m_total * 100) if m_total else 0
    print(f'  - {k}: {v} ({pct:.2f}%)')
