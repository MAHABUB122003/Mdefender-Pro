import os
import numpy as np
import joblib

class MLDetector:
    def __init__(self):
        model_dir = os.path.join(os.path.dirname(__file__), '../../models')
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self._load(model_dir)

    def _load(self, model_dir):
        model_path = os.path.join(model_dir, 'waf_model.pkl')
        scaler_path = os.path.join(model_dir, 'scaler.pkl')
        columns_path = os.path.join(model_dir, 'feature_columns.pkl')
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
            except Exception:
                self.model = None
        if os.path.exists(scaler_path):
            try:
                self.scaler = joblib.load(scaler_path)
            except Exception:
                self.scaler = None
        if os.path.exists(columns_path):
            try:
                self.feature_columns = joblib.load(columns_path)
            except Exception:
                self.feature_columns = None

    def predict(self, features):
        if self.model is None:
            return 0.0
        try:
            if self.feature_columns:
                row = [features.get(col, 0) for col in self.feature_columns]
            else:
                sorted_keys = sorted(features.keys())
                row = [features.get(k, 0) for k in sorted_keys]
            feature_vector = np.array([row])
            if self.scaler:
                feature_vector = self.scaler.transform(feature_vector)
            if hasattr(self.model, 'predict_proba'):
                proba = self.model.predict_proba(feature_vector)
                return float(proba[0][1])
            pred = self.model.predict(feature_vector)
            return float(pred[0])
        except Exception:
            return 0.0

    def get_attack_type(self, features):
        if features.get('has_sqli') or features.get('sql_score', 0) > 0:
            return 'SQL Injection'
        if features.get('has_xss') or features.get('xss_score', 0) > 0:
            return 'XSS'
        if features.get('has_lfi') or features.get('lfi_score', 0) > 0:
            return 'LFI'
        if features.get('has_cmd_injection') or features.get('rce_score', 0) > 0:
            return 'Command Injection'
        if features.get('has_csrf'):
            return 'CSRF'
        return 'Suspicious'
