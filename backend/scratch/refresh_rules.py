import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.engine.rule_engine import RuleEngine

def main():
    engine = RuleEngine()
    engine._load_rules(force_refresh=True)
    print(f"[+] Successfully refreshed {len(engine.default_rules)} enterprise rules in MongoDB db.rules!")

if __name__ == "__main__":
    main()
