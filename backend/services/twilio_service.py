from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import os
from flask import current_app
from dotenv import load_dotenv

# Same pattern as google_maps: ensure backend/.env is loaded even if import order differs
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_backend_dir, ".env"))


def format_to_e164(phone):
    """
    Normalize to E.164 for Twilio. Indian mobiles: +91 followed by 10 digits (6–9 leading digit).
    """
    if not phone:
        return phone
    s = str(phone).strip()
    cleaned = "".join(c for c in s if c.isdigit() or c == "+")

    if cleaned.startswith("+"):
        return cleaned

    # Leading 0 + 10 digits (common India local form)
    if len(cleaned) == 11 and cleaned.startswith("0"):
        cleaned = cleaned[1:]

    # 10-digit Indian mobile
    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"

    # 91 + 10 digits without +
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return f"+{cleaned}"

    # Other international digit strings
    if len(cleaned) > 10:
        return f"+{cleaned}"

    if len(cleaned) == 10:
        return f"+91{cleaned}"

    return f"+{cleaned}"


def _validate_account_sid(sid):
    """Twilio Account SID is always 34 chars: AC + 32 hex digits."""
    if not sid or not isinstance(sid, str):
        return "TWILIO_ACCOUNT_SID is empty"
    s = sid.strip()
    if not s.startswith("AC") or len(s) != 34:
        return (
            f"TWILIO_ACCOUNT_SID must be exactly 34 characters (AC + 32 hex). "
            f"Got length {len(s)} — re-copy from Twilio Console → Account SID (use the copy button)."
        )
    return None


def _twilio_settings():
    """Read from Flask config first, then os.environ (both stripped)."""
    load_dotenv(os.path.join(_backend_dir, ".env"))
    sid = (current_app.config.get("TWILIO_ACCOUNT_SID") or os.environ.get("TWILIO_ACCOUNT_SID") or "")
    token = (current_app.config.get("TWILIO_AUTH_TOKEN") or os.environ.get("TWILIO_AUTH_TOKEN") or "")
    from_num = (current_app.config.get("TWILIO_PHONE_NUMBER") or os.environ.get("TWILIO_PHONE_NUMBER") or "")
    if isinstance(sid, str):
        sid = sid.strip()
    if isinstance(token, str):
        token = token.strip()
    if isinstance(from_num, str):
        from_num = from_num.strip()
    return sid, token, from_num


def send_alert_sms(phone_number, message):
    """Send SMS alert using Twilio."""
    body = message
    try:
        formatted_to = format_to_e164(phone_number)
        account_sid, auth_token, from_number = _twilio_settings()

        if not all([account_sid, auth_token, from_number, body]):
            print("TWILIO: missing credentials or message; SMS skipped.")
            return False, "twilio_not_configured"

        sid_err = _validate_account_sid(account_sid)
        if sid_err:
            print(f"TWILIO: {sid_err}")
            return False, "invalid_account_sid"

        client = Client(account_sid, auth_token)

        msg = client.messages.create(body=body, from_=from_number, to=formatted_to)

        print(f"TWILIO: SMS sent sid={msg.sid} to=***{formatted_to[-4:]}")
        return True, None
    except TwilioRestException as e:
        print(
            f"TWILIO SMS FAILED: code={e.code} status={e.status} "
            f"to={format_to_e164(phone_number) if phone_number else '?'} — {e.msg}"
        )
        return False, str(e.msg)
    except Exception as e:
        print(f"TWILIO SMS DISPATCH FAILED: {type(e).__name__}: {e!s}")
        return False, str(e)


def send_deviation_alert(phone_number, current_location, safest_route):
    """Send alert when user deviates from safest route."""
    text = (
        f"Safety Alert: You have deviated from the safest route.\n"
        f"Current Location: {current_location}\n"
        f"Please return to the suggested route for maximum safety."
    )
    return send_alert_sms(phone_number, text)
