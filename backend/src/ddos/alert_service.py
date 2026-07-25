import time
import json
import asyncio
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List

from . import redis_service
from . import config


class AlertService:
    def __init__(self) -> None:
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()
        self._alert_key = "ddos:alerts:history"
        self._rate_limit_key = "ddos:alerts:rate_limit"

    async def send_alert(
        self,
        alert_type: str,
        severity: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, bool]:
        if not self.config.alerts.enabled:
            return {}

        if not await self.should_alert(alert_type):
            return {}

        alert_record = {
            'alert_type': alert_type,
            'severity': severity,
            'message': message,
            'details': details or {},
            'timestamp': time.time(),
        }

        await self.redis.add_to_sorted_set(
            self._alert_key,
            time.time(),
            json.dumps(alert_record),
        )

        rate_key = f"{self._rate_limit_key}:{alert_type}"
        await self.redis.increment_counter(rate_key, 3600)

        results: Dict[str, bool] = {}
        alerts = self.config.alerts

        if alerts.email_enabled and alerts.email_recipients:
            try:
                subject = f"[MDefender] {severity.upper()}: {alert_type}"
                body = json.dumps(alert_record, indent=2)
                await self.send_email(subject, body)
                results['email'] = True
            except Exception:
                results['email'] = False

        if alerts.slack_enabled and alerts.slack_webhook:
            try:
                slack_msg = {
                    'text': f"*[{severity.upper()}]* {alert_type}",
                    'blocks': [
                        {
                            'type': 'section',
                            'text': {
                                'type': 'mrkdwn',
                                'text': f"*Alert Type:* {alert_type}\n*Severity:* {severity}\n*Message:* {message}",
                            },
                        },
                    ],
                }
                if details:
                    slack_msg['blocks'].append({
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': f"*Details:*\n```{json.dumps(details, indent=2)}```",
                        },
                    })
                await self.send_slack(json.dumps(slack_msg))
                results['slack'] = True
            except Exception:
                results['slack'] = False

        if alerts.discord_enabled and alerts.discord_webhook:
            try:
                discord_msg = {
                    'embeds': [
                        {
                            'title': f'{severity.upper()}: {alert_type}',
                            'description': message,
                            'color': {
                                'critical': 0xFF0000,
                                'high': 0xFF6600,
                                'medium': 0xFFCC00,
                                'low': 0x00CC00,
                                'info': 0x0066FF,
                            }.get(severity.lower(), 0x808080),
                            'fields': [],
                        }
                    ],
                }
                if details:
                    for k, v in details.items():
                        discord_msg['embeds'][0]['fields'].append({
                            'name': str(k),
                            'value': str(v)[:1024],
                            'inline': True,
                        })
                await self.send_discord(json.dumps(discord_msg))
                results['discord'] = True
            except Exception:
                results['discord'] = False

        if alerts.telegram_enabled and alerts.telegram_bot_token and alerts.telegram_chat_id:
            try:
                telegram_msg = (
                    f"🚨 *MDefender Alert*\n\n"
                    f"*Type:* `{alert_type}`\n"
                    f"*Severity:* `{severity}`\n"
                    f"*Message:* {message}"
                )
                if details:
                    telegram_msg += f"\n\n*Details:*\n```{json.dumps(details, indent=2)}```"
                await self.send_telegram(json.dumps({
                    'chat_id': alerts.telegram_chat_id,
                    'text': telegram_msg,
                    'parse_mode': 'Markdown',
                }))
                results['telegram'] = True
            except Exception:
                results['telegram'] = False

        if alerts.webhook_enabled and alerts.webhook_url:
            try:
                await self.send_webhook(alert_record)
                results['webhook'] = True
            except Exception:
                results['webhook'] = False

        return results

    def _http_post(self, url: str, data: bytes, headers: Optional[Dict[str, str]] = None) -> bytes:
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        req = urllib.request.Request(
            url,
            data=data,
            headers=default_headers,
            method='POST',
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()

    async def send_email(self, subject: str, body: str) -> None:
        import smtplib
        from email.mime.text import MIMEText

        alerts = self.config.alerts

        def _send() -> None:
            for recipient in alerts.email_recipients:
                msg = MIMEText(body, 'plain', 'utf-8')
                msg['Subject'] = subject
                msg['From'] = getattr(alerts, 'email_from', 'mdefender@localhost')
                msg['To'] = recipient

                smtp_host = getattr(alerts, 'smtp_host', 'localhost')
                smtp_port = int(getattr(alerts, 'smtp_port', 25))
                smtp_user = getattr(alerts, 'smtp_user', '')
                smtp_pass = getattr(alerts, 'smtp_password', '')
                use_tls = getattr(alerts, 'smtp_tls', False)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    if use_tls:
                        server.starttls()
                    if smtp_user and smtp_pass:
                        server.login(smtp_user, smtp_pass)
                    server.send_message(msg)

        await asyncio.to_thread(_send)

    async def send_slack(self, message: str) -> None:
        await asyncio.to_thread(
            self._http_post,
            self.config.alerts.slack_webhook,
            message.encode('utf-8'),
        )

    async def send_discord(self, message: str) -> None:
        await asyncio.to_thread(
            self._http_post,
            self.config.alerts.discord_webhook,
            message.encode('utf-8'),
        )

    async def send_telegram(self, message: str) -> None:
        token = self.config.alerts.telegram_bot_token
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        await asyncio.to_thread(
            self._http_post,
            url,
            message.encode('utf-8'),
        )

    async def send_webhook(self, data: Any) -> None:
        payload = json.dumps(data) if isinstance(data, (dict, list)) else json.dumps({'data': str(data)})
        await asyncio.to_thread(
            self._http_post,
            self.config.alerts.webhook_url,
            payload.encode('utf-8'),
        )

    async def get_alert_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        now = time.time()
        members = await self.redis.get_sorted_set_range(
            self._alert_key, 0, now
        )

        alerts: List[Dict[str, Any]] = []
        for member in reversed(members[-limit:]):
            try:
                alert = json.loads(member)
                alerts.append(alert)
            except (json.JSONDecodeError, TypeError):
                continue

        return alerts

    async def clear_alert_history(self) -> None:
        await self.redis.delete_key(self._alert_key)

        if self.redis._connected:
            try:
                keys = await self.redis.get_keys(f"{self._rate_limit_key}:*")
                for key in keys:
                    await self.redis.delete_key(key)
            except Exception:
                pass

    async def should_alert(self, alert_type: str) -> bool:
        rate_key = f"{self._rate_limit_key}:{alert_type}"
        count = await self.redis.get_counter(rate_key)
        return count < 10
