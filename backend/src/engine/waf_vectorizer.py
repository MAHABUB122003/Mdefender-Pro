"""WAF text vectorizer - MUST stay in sync with ml/waf/sample_build.py.

The exact same normalization and HashingVectorizer parameters used at
training time are reconstructed here so inference is identical to training
(no training/serving skew). HashingVectorizer needs no fitted vocabulary,
so only the parameters need to match.
"""

import json
import os
import re
import urllib.parse

from sklearn.feature_extraction.text import HashingVectorizer

DEFAULT_PARAMS = {
    "analyzer": "char_wb",
    "ngram_range": (2, 6),
    "n_features": 2**19,
    "lowercase": True,
    "alternate_sign": False,
}

MAX_TEXT_LEN = 4000

_HTTP_METHOD_RE = re.compile(
    r"^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+",
    re.IGNORECASE,
)
_HTTP_VERSION_RE = re.compile(r"\s+HTTP/\d(\.\d)?(\s|$)")


def load_params():
    meta_path = os.path.join(os.path.dirname(__file__), "../../models/waf_meta.json")
    try:
        with open(meta_path, "r") as f:
            meta = json.load(f)
        params = meta.get("vectorizer", DEFAULT_PARAMS)
        params = {k: tuple(v) if isinstance(v, list) else v for k, v in params.items()}
        return params
    except Exception:
        return dict(DEFAULT_PARAMS)


def normalize_text(t):
    if not isinstance(t, str):
        t = "" if t is None else str(t)
    t = " ".join(t.split())
    if "%" in t:
        try:
            t = urllib.parse.unquote(t)
            if "%" in t:
                t = urllib.parse.unquote(t)
        except Exception:
            pass
        t = " ".join(t.split())
    # Strip the HTTP request envelope so live requests match training format.
    m = _HTTP_METHOD_RE.match(t)
    if m:
        t = t[m.end():]
    idx = _HTTP_VERSION_RE.search(t)
    if idx:
        t = t[: idx.start()]
    t = t.strip()
    if len(t) > MAX_TEXT_LEN:
        t = t[:MAX_TEXT_LEN]
    return t


def get_vectorizer():
    vec_file = os.path.join(os.path.dirname(__file__), "../../models/waf_vectorizer.pkl")
    if os.path.exists(vec_file):
        try:
            import joblib
            return joblib.load(vec_file)
        except Exception:
            pass
    params = load_params()
    return HashingVectorizer(**params)
