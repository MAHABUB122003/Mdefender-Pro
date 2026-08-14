import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from src.services.email_service import EmailService


class AuthEmailService:
    def __init__(self):
        self.email_service = EmailService()

    def _generate_link_fingerprint(self, url: str, token: str) -> str:
        return hashlib.sha256(f"{url}:{token}".encode()).hexdigest()[:8]

    def send_verification_email(self, to_email: str, verification_token: str,
                                frontend_url: str, anti_phishing_code: str = '') -> bool:
        try:
            from src.auth.config import AuthConfig
            config = AuthConfig()
            if not config.SMTP_SERVER or not config.SMTP_USERNAME:
                print(f"[AUTH EMAIL] Verification link: {frontend_url}/auth/verify-email?token={verification_token}&email={to_email}")
                return True

            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            import smtplib

            verify_url = f"{frontend_url}/auth/verify-email?token={verification_token}&email={to_email}"
            link_fingerprint = self._generate_link_fingerprint(verify_url, verification_token)
            display_code = anti_phishing_code or secrets.token_hex(4).upper()

            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Verify Your Email - MDefender Pro'
            msg['From'] = f'{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>'
            msg['To'] = to_email
            msg['X-Mailer'] = 'MDefender-Pro-Mailer/2.0'
            msg['List-Unsubscribe'] = f'<mailto:{config.SMTP_FROM_EMAIL}?subject=unsubscribe>'
            msg['Precedence'] = 'bulk'
            msg['Auto-Submitted'] = 'auto-replied'
            msg['X-Auto-Response-Suppress'] = 'All'

            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">MDefender Pro</h1>
                    <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Enterprise Web Application Firewall</p>
                </div>
                <div style="padding: 36px 32px; background: #ffffff; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
                    <p style="color: #64748b; line-height: 1.7; margin: 0 0 24px; font-size: 14px;">
                        Thank you for registering with MDefender Pro. Click the button below to verify your email and activate your account.
                    </p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{verify_url}"
                           style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; padding: 16px 48px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(99,102,241,0.35);">
                            Verify Email Address
                        </a>
                    </div>

                    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.6;">
                            <strong style="color: #334155;">Security Notice:</strong> This link expires in <strong>{config.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes</strong>.
                            If you did not create an account, please ignore this email. No account has been created without your confirmation.
                        </p>
                    </div>

                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.6;">
                            For your security, this verification email was sent to {to_email}.<br>
                            Link ID: {link_fingerprint} | Ref: MDP-{display_code}
                        </p>
                    </div>
                </div>

                <div style="text-align: center; padding: 20px 0;">
                    <p style="color: #94a3b8; font-size: 10px; margin: 0;">
                        MDefender Pro - Enterprise Security Solutions<br>
                        This is an automated security email. Please do not reply.
                    </p>
                </div>
            </body>
            </html>
            """

            text_body = (
                f"MDefender Pro - Email Verification\n\n"
                f"Click the link below to verify your email:\n{verify_url}\n\n"
                f"This link expires in {config.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes.\n"
                f"If you did not create an account, please ignore this email.\n\n"
                f"Link ID: {link_fingerprint} | Ref: MDP-{display_code}"
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
            print(f"[AUTH EMAIL] Failed to send verification email: {e}")
            return False

    def send_password_reset_email(self, to_email: str, reset_token: str,
                                  frontend_url: str) -> bool:
        try:
            from src.auth.config import AuthConfig
            config = AuthConfig()
            if not config.SMTP_SERVER or not config.SMTP_USERNAME:
                print(f"[AUTH EMAIL] Password reset link: {frontend_url}/auth/reset-password?token={reset_token}")
                return True

            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            import smtplib

            reset_url = f"{frontend_url}/auth/reset-password?token={reset_token}"

            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Reset Your Password - MDefender Pro'
            msg['From'] = f'{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>'
            msg['To'] = to_email
            msg['X-Mailer'] = 'MDefender-Pro-Mailer/2.0'
            msg['Auto-Submitted'] = 'auto-replied'
            msg['X-Auto-Response-Suppress'] = 'All'

            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0; font-size: 24px;">MDefender Pro</h1>
                </div>
                <div style="padding: 36px 32px; background: #ffffff; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 700;">Reset Your Password</h2>
                    <p style="color: #64748b; line-height: 1.7; margin: 0 0 24px; font-size: 14px;">
                        We received a password reset request for your account. Click the button below to create a new password.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{reset_url}"
                           style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px 48px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(239,68,68,0.35);">
                            Reset Password
                        </a>
                    </div>
                    <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #fecaca;">
                        <p style="color: #991b1b; font-size: 12px; margin: 0; line-height: 1.6;">
                            <strong>Security Notice:</strong> This link expires in <strong>{config.PASSWORD_RESET_EXPIRE_MINUTES} minutes</strong>.
                            If you did not request a password reset, secure your account immediately and contact support.
                        </p>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px 0;">
                    <p style="color: #94a3b8; font-size: 10px; margin: 0;">
                        MDefender Pro - Enterprise Security Solutions<br>
                        This is an automated security email. Please do not reply.
                    </p>
                </div>
            </body>
            </html>
            """

            text_body = (
                f"MDefender Pro - Password Reset\n\n"
                f"Click the link below to reset your password:\n{reset_url}\n\n"
                f"This link expires in {config.PASSWORD_RESET_EXPIRE_MINUTES} minutes.\n"
                f"If you did not request a password reset, secure your account immediately."
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
