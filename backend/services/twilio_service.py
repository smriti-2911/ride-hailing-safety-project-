from twilio.rest import Client
import os
from flask import current_app

def format_to_e164(phone):
    if not phone:
        return phone
    # Strip spaces, dashes, parentheses
    cleaned = ''.join(filter(lambda x: x.isdigit() or x == '+', str(phone)))
    if not cleaned.startswith('+'):
        # Assume India +91 if 10 digits
        if len(cleaned) == 10:
            return f"+91{cleaned}"
        elif len(cleaned) > 10:
            return f"+{cleaned}"
        else:
            return f"+91{cleaned}" # Fallback
    return cleaned

def send_alert_sms(phone_number, message):
    """Send SMS alert using Twilio."""
    try:
        formatted_number = format_to_e164(phone_number)
        account_sid = current_app.config['TWILIO_ACCOUNT_SID']
        auth_token = current_app.config['TWILIO_AUTH_TOKEN']
        from_number = current_app.config['TWILIO_PHONE_NUMBER']
        
        client = Client(account_sid, auth_token)
        
        message = client.messages.create(
            body=message,
            from_=from_number,
            to=formatted_number
        )
        
        return True, None
    except Exception as e:
        print(f"TWILIO SMS DISPATCH FAILED: {str(e)}")
        return False, str(e)

def send_deviation_alert(phone_number, current_location, safest_route):
    """Send alert when user deviates from safest route."""
    message = (
        f"Safety Alert: You have deviated from the safest route.\n"
        f"Current Location: {current_location}\n"
        f"Please return to the suggested route for maximum safety."
    )
    return send_alert_sms(phone_number, message)
