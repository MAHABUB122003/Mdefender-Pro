"""MDefender Pro WAF ML detector.

Loads the version-2 WAF models:
  - binary attack detector (SGDClassifier / logistic on char n-grams)
  - attack category model (multi-class SGD)

API:
    detector.detect(text) -> {
        'prediction': 0|1,
        'probability': float (P(attack)),
        'attack': bool,
        'category': str|None,
        'confidence': float,
        'risk_score': int 0-100,
        'model_version': str,
        'threshold': float,
    }
"""

import json
import os
import time

import joblib
import numpy as np

from src.engine.waf_vectorizer import get_vectorizer, normalize_text

MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../models")


class MLDetector:
    def __init__(self, model_dir=None):
        self.model_dir = model_dir or MODEL_DIR
        self.model = None
        self.category_model = None
        self.category_classes = []
        self.meta = {}
        self.threshold = 0.7
        self.vectorizer = None
        self.loaded = False
        self.load_error = None
        self._load()

    def _load(self):
        try:
            self.vectorizer = get_vectorizer()
        except Exception as e:
            self.load_error = f"vectorizer: {e}"

        model_path = os.path.join(self.model_dir, "waf_model.pkl")
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
            except Exception as e:
                self.load_error = f"waf model: {e}"

        cat_path = os.path.join(self.model_dir, "waf_category_model.pkl")
        if os.path.exists(cat_path):
            try:
                self.category_model = joblib.load(cat_path)
            except Exception as e:
                self.load_error = f"category model: {e}"

        meta_path = os.path.join(self.model_dir, "waf_meta.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    self.meta = json.load(f)
                self.category_classes = self.meta.get("category_classes", [])
                self.threshold = float(self.meta.get("threshold", 0.7))
            except Exception as e:
                self.load_error = f"meta: {e}"

        self.loaded = self.model is not None
        self.model_version = self.meta.get("version", "unknown")

    def is_loaded(self):
        return self.loaded

    def get_status(self):
        return {
            "loaded": self.loaded,
            "model_version": self.model_version,
            "threshold": self.threshold,
            "n_category_classes": len(self.category_classes),
            "load_error": self.load_error,
            "training_date": self.meta.get("training_date"),
        }

    def _predict_proba(self, normalized):
        X = self.vectorizer.transform([normalized])
        if hasattr(self.model, "predict_proba"):
            return float(self.model.predict_proba(X)[0][1])
        return float(self.model.predict(X)[0])

    def _predict_category(self, normalized):
        if self.category_model is None or not self.category_classes:
            return None
        try:
            X = self.vectorizer.transform([normalized])
            proba = self.category_model.predict_proba(X)[0]
            idx = int(np.argmax(proba))
            return self.category_classes[idx]
        except Exception:
            return None

    def detect(self, text, threshold=None):
        """text: raw combined request text (url + query + body + params)."""
        if not self.loaded:
            return {
                "prediction": 0,
                "probability": 0.0,
                "attack": False,
                "category": None,
                "confidence": 0.0,
                "risk_score": 0,
                "model_version": self.model_version,
                "threshold": self.threshold,
                "error": "model not loaded",
            }
        thr = threshold if threshold is not None else self.threshold
        normalized = normalize_text(text)
        proba = self._predict_proba(normalized)
        attack = bool(proba >= thr)
        category = self._predict_category(normalized) if attack else None
        risk_score = min(100, max(0, int(round(proba * 100))))
        return {
            "prediction": int(attack),
            "probability": round(proba, 6),
            "attack": attack,
            "category": category,
            "confidence": round(proba, 4) if attack else round(1 - proba, 4),
            "risk_score": risk_score,
            "model_version": self.model_version,
            "threshold": thr,
        }

    def analyze(self, text, threshold=None):
        """Backward-compatible alias used by waf_api."""
        return self.detect(text, threshold=threshold)
