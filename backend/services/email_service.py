import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

from config import EMAIL_USER, EMAIL_PASS

# In-memory OTP store: { email: { "otp": "123456", "expires": datetime, "data": {...} } }
_otp_store = {}

OTP_EXPIRY_MINUTES = 5


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def send_otp_email(to_email: str, otp: str) -> bool:
    subject = "NOIR - Your Verification Code"
    html = f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 0.1em; margin: 0 0 32px 0; text-align: center;">NOIR</h1>
        <p style="font-size: 14px; color: #52525b; margin: 0 0 24px 0; text-align: center;">
            Your verification code is:
        </p>
        <div style="background: #000; color: #fff; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; text-align: center; padding: 20px; margin: 0 0 24px 0;">
            {otp}
        </div>
        <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">
            This code expires in {OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.
        </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
        print(f"[EMAIL] OTP sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send OTP to {to_email}: {e}")
        return False


def store_otp(email: str, otp: str, registration_data: dict):
    _otp_store[email] = {
        "otp": otp,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES),
        "data": registration_data,
    }
    print(f"[OTP] Stored for {email}, expires in {OTP_EXPIRY_MINUTES} min")


def verify_otp(email: str, otp: str):
    entry = _otp_store.get(email)
    if not entry:
        return None, "No OTP found. Please request a new one."

    if datetime.now(timezone.utc) > entry["expires"]:
        del _otp_store[email]
        return None, "OTP has expired. Please request a new one."

    if entry["otp"] != otp:
        return None, "Invalid OTP. Please try again."

    data = entry["data"]
    del _otp_store[email]
    return data, None
