import os
import base64
from html import escape as html_escape
import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from src.services.email_service import EmailService

# Load official MDefender Pro logo for inline email embedding
_LOGO_PATH = os.path.join(os.path.dirname(__file__), 'mdefender_logo.png')
_LOGO_B64 = ""
if os.path.exists(_LOGO_PATH):
    try:
        with open(_LOGO_PATH, 'rb') as _f:
            _LOGO_B64 = base64.b64encode(_f.read()).decode('utf-8')
    except Exception:
        pass


class AuthEmailService:
    def __init__(self):
        self.email_service = EmailService()

    def _generate_link_fingerprint(self, url: str, token: str) -> str:
        return hashlib.sha256(f"{url}:{token}".encode()).hexdigest()[:8]

    def _send_smtp_message(self, config, msg, to_email: str, otp_code: str = '', purpose: str = 'auth') -> bool:
        print(f"\n[SECURITY OTP] =========================================")
        print(f"[SECURITY OTP] Recipient: {to_email}")
        if otp_code:
            print(f"[SECURITY OTP] 6-DIGIT CODE: >>> {otp_code} <<<")
        print(f"[SECURITY OTP] Purpose:   {purpose}")
        print(f"[SECURITY OTP] =========================================\n")

        if not config.SMTP_SERVER or not config.SMTP_USERNAME or not config.SMTP_PASSWORD:
            print(f"[AUTH EMAIL] SMTP server/credentials not fully configured. Using console OTP delivery.")
            return True

        from email.mime.text import MIMEText
        import smtplib

        # Try Port 587 STARTTLS
        try:
            with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT, timeout=8) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD.replace(' ', ''))
                server.send_message(msg)
            print(f"[AUTH EMAIL] Email successfully sent to {to_email} via SMTP (Port {config.SMTP_PORT})")
            return True
        except Exception as e587:
            print(f"[AUTH EMAIL] Port {config.SMTP_PORT} delivery error: {e587}. Trying SSL Port 465 fallback...")
            try:
                with smtplib.SMTP_SSL(config.SMTP_SERVER, 465, timeout=8) as ssl_server:
                    ssl_server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD.replace(' ', ''))
                    ssl_server.send_message(msg)
                print(f"[AUTH EMAIL] Email successfully sent to {to_email} via SMTP_SSL (Port 465)")
                return True
            except Exception as e465:
                print(f"[AUTH EMAIL] SMTP delivery failed ({e465}). OTP was printed to console for development/fallback.")
                return False

    def send_verification_email(self, to_email: str, verification_token: str,
                                frontend_url: str, anti_phishing_code: str = '',
                                otp_code: str = '', username: str = '') -> bool:
        try:
            from src.auth.config import AuthConfig
            config = AuthConfig()

            display_otp = otp_code or (verification_token if len(verification_token) == 6 and verification_token.isdigit() else '')
            display_code = anti_phishing_code or secrets.token_hex(4).upper()
            now_utc = datetime.now(timezone.utc).strftime('%b %d, %Y • %H:%M UTC')

            clean_user = (username or '').strip().lstrip('@')
            safe_user = html_escape(clean_user)
            safe_email = html_escape(to_email)
            safe_otp = html_escape(display_otp or verification_token)
            user_greeting = f"Hi @{safe_user}," if safe_user else "Hi there,"

            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart('alternative')
            if display_otp:
                msg['Subject'] = f'{display_otp} is your MDefender Pro verification code'
            else:
                msg['Subject'] = 'Verify your email address - MDefender Pro'

            from_addr = config.SMTP_FROM_EMAIL or config.SMTP_USERNAME or "noreply@mdefender-pro.io"
            msg['From'] = f'{config.SMTP_FROM_NAME} <{from_addr}>'
            msg['To'] = to_email
            msg['X-Mailer'] = 'MDefender-Pro-Security-Mailer/3.0'
            msg['List-Unsubscribe'] = f'<mailto:{from_addr}?subject=unsubscribe>'
            msg['Precedence'] = 'bulk'
            msg['Auto-Submitted'] = 'auto-replied'
            msg['X-Auto-Response-Suppress'] = 'All'

            html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - MDefender Pro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #24292f; -webkit-font-smoothing: antialiased; line-height: 1.5;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 28px 16px;">
        <tr>
            <td align="center">
                <!-- Main Container (GitHub style: clean, natural, max-width 540px) -->
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 540px; text-align: left;">
                    
                    <!-- Brand Header with Shield Logo -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 36px; height: 36px; vertical-align: middle;">
                                        <img src="data:image/png;base64,{_LOGO_B64}" width="36" height="36" alt="MDefender Pro Logo" style="display: block; width: 36px; height: 36px; border-radius: 8px; object-fit: contain;" />
                                    </td>
                                    <td style="padding-left: 12px; vertical-align: middle;">
                                        <span style="font-size: 19px; font-weight: 800; color: #1f2328; letter-spacing: -0.3px;">MDefender <span style="color: #e8792f;">Pro</span></span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="font-size: 14px; color: #24292f;">
                            <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2328;">
                                {user_greeting}
                            </p>

                            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #57606a;">
                                Please verify your email address to complete your registration for your MDefender Pro security workspace.
                            </p>

                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #57606a;">
                                Here is your 6-digit verification code:
                            </p>

                            <!-- Clean Monospace OTP Box with Copy Tag -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 10px 0 20px 0;">
                                <tr>
                                    <td style="background-color: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 10px 22px; vertical-align: middle;">
                                        <span style="font-family: ui-monospace, SFMono-Regular, 'SF Pro Display', Menlo, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1f2328; user-select: all;">{display_otp or verification_token}</span>
                                    </td>
                                    <td style="padding-left: 12px; vertical-align: middle;">
                                        <span style="display: inline-block; background-color: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #24292f;">
                                            📋 Select & Copy
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #57606a;">
                                This code will expire in <strong>1 minute</strong>. Enter this code on your verification screen to activate your account.
                            </p>

                            <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #57606a;">
                                If you did not request this verification code, you can safely ignore this email. Someone may have entered your email address by mistake.
                            </p>

                            <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #24292f;">
                                Thanks,<br>
                                <strong>The MDefender Pro Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Minimalist Footer -->
                    <tr>
                        <td style="border-top: 1px solid #d0d7de; padding-top: 20px; font-size: 11px; line-height: 1.6; color: #57606a;">
                            MDefender Pro Inc. • Autonomous Cloud WAF & Global Edge Network<br>
                            Sent to {to_email} • Security ref: MDP-{display_code} • {now_utc}
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

            text_body = (
                f"{user_greeting}\n\n"
                f"Please verify your email address to complete your registration for MDefender Pro.\n\n"
                f"Here is your 6-digit verification code:\n"
                f"{display_otp or verification_token}\n\n"
                f"This code will expire in 1 minute. Enter this code on your verification screen to proceed.\n\n"
                f"If you did not request this verification code, you can safely ignore this email.\n\n"
                f"Thanks,\n"
                f"The MDefender Pro Team\n\n"
                f"Ref: MDP-{display_code} • {now_utc}"
            )

            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            return self._send_smtp_message(config, msg, to_email, otp_code=display_otp or verification_token, purpose='email_verification')
        except Exception as e:
            print(f"[AUTH EMAIL] Failed to send verification email: {e}")
            return False

    def send_password_reset_email(self, to_email: str, reset_token: str,
                                  frontend_url: str, otp_code: str = '',
                                  username: str = '') -> bool:
        try:
            from src.auth.config import AuthConfig
            config = AuthConfig()

            display_otp = otp_code or (reset_token if len(reset_token) == 6 and reset_token.isdigit() else '')
            display_code = secrets.token_hex(4).upper()
            now_utc = datetime.now(timezone.utc).strftime('%b %d, %Y • %H:%M UTC')

            clean_user = (username or '').strip().lstrip('@')
            safe_user = html_escape(clean_user)
            safe_email = html_escape(to_email)
            safe_otp = html_escape(display_otp or reset_token)
            user_greeting = f"Hi @{safe_user}," if safe_user else "Hi there,"

            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart('alternative')
            if display_otp:
                msg['Subject'] = f'{display_otp} is your MDefender Pro password reset code'
            else:
                msg['Subject'] = 'Reset your password - MDefender Pro'

            from_addr = config.SMTP_FROM_EMAIL or config.SMTP_USERNAME or "noreply@mdefender-pro.io"
            msg['From'] = f'{config.SMTP_FROM_NAME} <{from_addr}>'
            msg['To'] = to_email
            msg['X-Mailer'] = 'MDefender-Pro-Security-Mailer/3.0'
            msg['Precedence'] = 'bulk'
            msg['Auto-Submitted'] = 'auto-replied'
            msg['X-Auto-Response-Suppress'] = 'All'

            html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request - MDefender Pro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #24292f; -webkit-font-smoothing: antialiased; line-height: 1.5;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 28px 16px;">
        <tr>
            <td align="center">
                <!-- Main Container (GitHub style: clean, natural, max-width 540px) -->
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 540px; text-align: left;">
                    
                    <!-- Brand Header with Shield Logo -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 36px; height: 36px; vertical-align: middle;">
                                        <img src="data:image/png;base64,{_LOGO_B64}" width="36" height="36" alt="MDefender Pro Logo" style="display: block; width: 36px; height: 36px; border-radius: 8px; object-fit: contain;" />
                                    </td>
                                    <td style="padding-left: 12px; vertical-align: middle;">
                                        <span style="font-size: 19px; font-weight: 800; color: #1f2328; letter-spacing: -0.3px;">MDefender <span style="color: #e8792f;">Pro</span></span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="font-size: 14px; color: #24292f;">
                            <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2328;">
                                {user_greeting}
                            </p>

                            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #57606a;">
                                We heard that you requested a password reset for your MDefender Pro account.
                            </p>

                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #57606a;">
                                Here is your 6-digit password reset code:
                            </p>

                            <!-- Clean Monospace OTP Box with Copy Tag (No Harsh Red Box) -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 10px 0 20px 0;">
                                <tr>
                                    <td style="background-color: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 10px 22px; vertical-align: middle;">
                                        <span style="font-family: ui-monospace, SFMono-Regular, 'SF Pro Display', Menlo, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1f2328; user-select: all;">{display_otp or reset_token}</span>
                                    </td>
                                    <td style="padding-left: 12px; vertical-align: middle;">
                                        <span style="display: inline-block; background-color: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #24292f;">
                                            📋 Select & Copy
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #57606a;">
                                This code will expire in <strong>1 minute</strong>. Enter this code on your password reset screen to set a new password.
                            </p>

                            <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #57606a;">
                                If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.
                            </p>

                            <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #24292f;">
                                Thanks,<br>
                                <strong>The MDefender Pro Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Minimalist Footer -->
                    <tr>
                        <td style="border-top: 1px solid #d0d7de; padding-top: 20px; font-size: 11px; line-height: 1.6; color: #57606a;">
                            MDefender Pro Inc. • Autonomous Cloud WAF & Global Edge Network<br>
                            Sent to {to_email} • Security ref: MDP-{display_code} • {now_utc}
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

            text_body = (
                f"{user_greeting}\n\n"
                f"We heard that you requested a password reset for your MDefender Pro account.\n\n"
                f"Here is your 6-digit password reset code:\n"
                f"{display_otp or reset_token}\n\n"
                f"This code will expire in 1 minute. Enter this code on your password reset screen to set a new password.\n\n"
                f"If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.\n\n"
                f"Thanks,\n"
                f"The MDefender Pro Team\n\n"
                f"Ref: MDP-{display_code} • {now_utc}"
            )

            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            return self._send_smtp_message(config, msg, to_email, otp_code=display_otp or reset_token, purpose='password_reset')
        except Exception as e:
            print(f"[AUTH EMAIL] Failed to send password reset email: {e}")
            return False

    def send_security_alert(self, to_email: str, event_type: str,
                            ip_address: str, user_agent: str) -> bool:
        try:
            from src.auth.config import AuthConfig
            config = AuthConfig()
            if not config.SMTP_SERVER or not config.SMTP_USERNAME:
                print(f"[AUTH EMAIL] Security alert ({event_type}) for {to_email} from {ip_address}")
                return True

            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            import smtplib

            msg = MIMEMultipart('alternative')
            msg['Subject'] = f'Security Alert - {event_type} - MDefender Pro'
            msg['From'] = f'{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>'
            msg['To'] = to_email
            msg['X-Priority'] = '1'
            msg['Importance'] = 'high'
            msg['X-Mailer'] = 'MDefender-Pro-Mailer/2.0'
            msg['Auto-Submitted'] = 'auto-replied'

            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0; font-size: 24px;">MDefender Pro</h1>
                </div>
                <div style="padding: 36px 32px; background: #ffffff; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                    <div style="background: #fef2f2; border-radius: 10px; padding: 16px; margin-bottom: 20px; border: 1px solid #fecaca;">
                        <h2 style="color: #dc2626; margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            Security Alert
                        </h2>
                    </div>
                    <p style="color: #64748b; line-height: 1.7; margin: 0 0 20px; font-size: 14px;">
                        A security event was detected on your account. Review the details below:
                    </p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px; vertical-align: top;"><strong>Event:</strong></td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">{event_type}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>IP Address:</strong></td><td style="padding: 8px 0; color: #1e293b; font-size: 13px; font-family: monospace;">{ip_address}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Device:</strong></td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">{user_agent[:120]}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Time:</strong></td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">{datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</td></tr>
                        </table>
                    </div>
                    <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-top: 20px; border: 1px solid #fecaca;">
                        <p style="color: #991b1b; font-size: 12px; margin: 0; line-height: 1.6;">
                            <strong>If this wasn't you:</strong> Change your password immediately and enable MFA.
                            Contact our security team if you suspect unauthorized access.
                        </p>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px 0;">
                    <p style="color: #94a3b8; font-size: 10px; margin: 0;">
                        MDefender Pro - Enterprise Security Solutions<br>
                        This is an automated security alert. Please do not reply.
                    </p>
                </div>
            </body>
            </html>
            """

            text_body = (
                f"MDefender Pro - Security Alert\n\n"
                f"Event: {event_type}\n"
                f"IP Address: {ip_address}\n"
                f"Device: {user_agent[:120]}\n\n"
                f"If this wasn't you, change your password immediately and enable MFA."
            )

            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html, 'html'))

            with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
                server.send_message(msg)

            return True
        except Exception as e:
            print(f"[AUTH EMAIL] Failed to send security alert: {e}")
            return False
