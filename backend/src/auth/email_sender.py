from src.services.email_service import EmailService


class AuthEmailService:
    def __init__(self):
        self.email_service = EmailService()

    def send_verification_email(self, to_email: str, verification_token: str,
                                frontend_url: str) -> bool:
        try:
            from src.auth.config import AuthConfig
            config = AuthConfig()
            if not config.SMTP_SERVER or not config.SMTP_USERNAME:
                print(f"[AUTH EMAIL] Verification link: {frontend_url}/auth/verify-email?token={verification_token}")
                return True

            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            import smtplib

            verify_url = f"{frontend_url}/auth/verify-email?token={verification_token}"

            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Verify Your Email - MDefender Pro'
            msg['From'] = f'{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>'
            msg['To'] = to_email

            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1a1a2e; padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0;">MDefender Pro</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
                    <h2 style="color: #333;">Verify Your Email Address</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Thank you for registering with MDefender Pro. Please click the button below to verify your email address.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verify_url}"
                           style="background: #00d4ff; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #999; font-size: 12px;">
                        This link expires in {config.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes.<br>
                        If you didn't create an account, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html, 'html'))

            with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
                server.starttls()
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

            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1a1a2e; padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0;">MDefender Pro</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
                    <h2 style="color: #333;">Reset Your Password</h2>
                    <p style="color: #666; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}"
                           style="background: #ff6b35; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #999; font-size: 12px;">
                        This link expires in {config.PASSWORD_RESET_EXPIRE_MINUTES} minutes.<br>
                        If you didn't request a password reset, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html, 'html'))

            with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
                server.starttls()
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

            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1a1a2e; padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0;">MDefender Pro</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
                    <h2 style="color: #ff6b35;">Security Alert</h2>
                    <p style="color: #666; line-height: 1.6;">
                        A security event was detected on your account:
                    </p>
                    <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #ff6b35;">
                        <p><strong>Event:</strong> {event_type}</p>
                        <p><strong>IP Address:</strong> {ip_address}</p>
                        <p><strong>Device:</strong> {user_agent[:100]}</p>
                    </div>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        If this wasn't you, please change your password immediately and contact support.
                    </p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html, 'html'))

            with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
                server.starttls()
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
                server.send_message(msg)

            return True
        except Exception as e:
            print(f"[AUTH EMAIL] Failed to send security alert: {e}")
            return False
