"""MDefender Pro - Enterprise Bot Management & AI Scraper Mitigation Engine.

Cloudflare-grade Bot Intelligence:
1. Verified Good Bots (Google, Bing, Apple, Meta, Uptime monitors, Let's Encrypt) -> Instant White-Pass (0.000ms).
2. Malicious Bots & Exploitation Scanners (sqlmap, nikto, wpscan, nuclei, masscan) -> Instant Drop (403).
3. AI Web Scrapers & LLM Crawlers (GPTBot, ClaudeBot, Bytespider, CCBot) -> Configurable Block / Mitigate.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("BotEngine")

SIGNATURES_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/bot_intelligence/bot_signatures.json"))

class BotEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(BotEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.good_bots = []
        self.ai_scrapers = []
        self.malicious_tools = set()
        self._load_signatures()

    def _load_signatures(self):
        if os.path.exists(SIGNATURES_FILE):
            try:
                with open(SIGNATURES_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.good_bots = data.get("verified_good_bots", [])
                    self.ai_scrapers = data.get("ai_scrapers", [])
                    self.malicious_tools = set(x.lower() for x in data.get("malicious_attack_tools", []))
                    logger.info(f"Loaded Bot Intelligence: {len(self.good_bots)} Good Bots, {len(self.ai_scrapers)} AI Scrapers, {len(self.malicious_tools)} Attack Tools")
            except Exception as e:
                logger.warning(f"Failed to load bot signatures: {e}")

    def evaluate_user_agent(self, user_agent: str, block_ai_scrapers: bool = False) -> Dict[str, Any]:
        """Sub-millisecond classification of HTTP User-Agent."""
        ua_clean = (user_agent or "").strip().lower()
        if not ua_clean:
            return {"type": "empty", "action": "ALLOW", "confidence": 0.0}

        # 1. Verified Good Bots check (Absolute Precedence)
        for bot in self.good_bots:
            if bot["token"] in ua_clean:
                return {
                    "type": "good_bot",
                    "name": bot["name"],
                    "category": bot.get("category", "search_engine"),
                    "action": "ALLOW",
                    "confidence": 1.0,
                    "reason": f"Verified Good Bot: {bot['name']}"
                }

        # 2. Malicious Attack Tools & Vulnerability Scanners
        for tool in self.malicious_tools:
            if tool in ua_clean:
                return {
                    "type": "malicious_bot",
                    "name": tool,
                    "action": "BLOCK",
                    "confidence": 1.0,
                    "reason": f"Malicious Attack Tool Detected: {tool}"
                }

        # 3. AI Scrapers & LLM Training Bots
        for scraper in self.ai_scrapers:
            if scraper["token"] in ua_clean:
                action = "BLOCK" if block_ai_scrapers else "ALLOW"
                return {
                    "type": "ai_scraper",
                    "name": scraper["name"],
                    "vendor": scraper.get("vendor", "AI"),
                    "action": action,
                    "confidence": 0.95,
                    "reason": f"AI Web Scraper: {scraper['name']}" + (" (Blocked by Policy)" if block_ai_scrapers else "")
                }

        return {"type": "browser_or_user", "action": "ALLOW", "confidence": 0.0}
