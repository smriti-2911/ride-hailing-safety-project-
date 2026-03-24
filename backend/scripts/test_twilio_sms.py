#!/usr/bin/env python3
"""
Twilio smoke test — uses the same code path as the API (Flask app context + send_alert_sms).

Usage (from repo root or backend/):
  backend/venv/bin/python backend/scripts/test_twilio_sms.py
      → Validates .env + Twilio REST auth only (no SMS).

  backend/venv/bin/python backend/scripts/test_twilio_sms.py +9198XXXXXXX
      → Sends one test SMS to that number (use your verified number on a trial account).

Do not commit phone numbers or share .env.
"""
import os
import sys

# Resolve backend directory when run from anywhere
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.abspath(os.path.join(_here, ".."))
if _backend not in sys.path:
    sys.path.insert(0, _backend)
os.chdir(_backend)

from dotenv import load_dotenv

load_dotenv(os.path.join(_backend, ".env"))


def main():
    from app import app
    from services.twilio_service import send_alert_sms, format_to_e164
    from twilio.rest import Client

    sid = (os.environ.get("TWILIO_ACCOUNT_SID") or "").strip()
    token = (os.environ.get("TWILIO_AUTH_TOKEN") or "").strip()
    from_num = (os.environ.get("TWILIO_PHONE_NUMBER") or "").strip()

    print("--- Twilio env ---")
    sid_ok = sid.startswith("AC") and len(sid) == 34
    print(f"  TWILIO_ACCOUNT_SID: {'OK (34 chars)' if sid_ok else f'INVALID (len={len(sid)}, need 34 — use Console copy button)'}")
    print(f"  TWILIO_AUTH_TOKEN:  {'OK' if len(token) >= 16 else 'MISSING/short'}")
    print(f"  TWILIO_PHONE_NUMBER: {'OK' if from_num.startswith('+') else 'MISSING/needs E.164'}")

    if not all([sid, token, from_num]):
        print("\nFix backend/.env and try again.")
        sys.exit(1)
    if not sid_ok:
        print("\nAccount SID must be exactly 34 characters (AC + 32 hex digits). Truncation causes HTTP 401.")
        sys.exit(1)

    client = Client(sid, token)
    try:
        account = client.api.accounts(sid).fetch()
        print(f"\n--- Twilio API auth OK (account status: {account.status}) ---")
    except Exception as e:
        print(f"\n--- Twilio API auth FAILED: {e} ---")
        if "401" in str(e) or "Authentication" in str(e):
            print(
                "\n  → In Twilio Console: Account → API keys & tokens → copy Account SID + Auth Token\n"
                "     into backend/.env (same project). Regenerate token if unsure. Restart after saving."
            )
        sys.exit(1)

    if len(sys.argv) < 2:
        print("\nNo phone argument — skipping SMS send.")
        print("To send a real test SMS, run:")
        print(f"  {sys.executable} {os.path.abspath(__file__)} +91XXXXXXXXXX")
        sys.exit(0)

    raw_to = sys.argv[1]
    to = format_to_e164(raw_to)
    body = (
        "NavSafe test: Twilio SMS from your backend is working. "
        "You can wire the frontend to the same API."
    )

    with app.app_context():
        ok, err = send_alert_sms(to, body)

    if ok:
        print(f"\n--- SMS send reported OK (to {to}) — check the handset. ---")
        sys.exit(0)
    print(f"\n--- SMS send failed: {err} ---")
    sys.exit(1)


if __name__ == "__main__":
    main()
