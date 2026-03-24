"""
Plan A — Twilio SMS copy for NavSafe. Sent to rider + emergency contact when applicable.
Ledger rows use the same `status` (demo scenario id or server status) as event_type.
"""


def _loc(lat, lng):
    if lat is None or lng is None:
        return ""
    return f" Last known position: {lat:.5f},{lng:.5f}."


def ride_started_message(user_name, pickup, dropoff):
    """Sent once on POST /book-ride (not repeated on first simulator tick)."""
    name = (user_name or "Rider").strip()
    return (
        f"NavSafe: Monitored ride started for {name}. "
        f"Pickup: {pickup}. Drop-off: {dropoff}. "
        f"You will receive SMS on significant safety events during this trip."
    )


def ride_completed_message(user_name, dropoff):
    name = (user_name or "Rider").strip()
    return (
        f"NavSafe: Ride completed safely for {name}. "
        f"Destination: {dropoff}. Thank you for using NavSafe."
    )


def plan_a_sms_for_ledger_event(status, action, state_changed, ride, user, lat, lng):
    """
    Returns SMS body to send, or None (in-app / ledger only).

    - Aligns with activity ledger: we only consider rows when the ride route logs an event.
    - Skips RIDE_STARTED in-sim (ride start is only the book-ride SMS).
    """
    name = (user.name or "Rider").strip()
    src = ride.source
    dst = ride.destination
    loc = _loc(lat, lng)

    if action == "NEW_SOS":
        return (
            f"NavSafe SOS: Possible critical safety threat on {name}'s ride. "
            f"Route: {src} to {dst}.{loc}"
        )

    if action == "RECOVERED":
        return (
            f"NavSafe update: {name}'s ride is back on the planned route "
            f"({src} to {dst}). Situation normalized."
        )

    if not state_changed:
        return None

    # Do not duplicate "ride started" — already sent at booking.
    if status == "RIDE_STARTED":
        return None

    # In-app only for these (noise / informational; still in ledger for timeline).
    if status in (
        "CRUISE_NORMAL",
        "VISIBILITY_MODERATE",
        "VISIBILITY_HIGH",
        "TRAFFIC_DELAY",
        "IDLE",
        "RECOVERED_CRUISE",
        "DESTINATION_APPROACH",
        "ON_SAFE_ROUTE",
    ):
        return None

    if status == "SLIGHT_DEVIATION":
        return (
            f"NavSafe alert: Route deviation detected on {name}'s ride "
            f"({src} to {dst}). Slight offset from corridor; monitoring.{loc}"
        )

    if status == "SUSTAINED_DEVIATION":
        return (
            f"NavSafe alert: Sustained deviation from the planned route on {name}'s ride "
            f"({src} to {dst}). Escalated monitoring.{loc}"
        )

    if status == "SUSTAINED_DEVIATION_HIGH_RISK":
        return (
            f"NavSafe alert: High-risk sustained deviation on {name}'s ride "
            f"({src} to {dst}). Review the app for live status.{loc}"
        )

    if status == "LONG_IDLE":
        return (
            f"NavSafe alert: Extended stop on {name}'s ride ({src} to {dst}). "
            f"Vehicle idle longer than expected.{loc}"
        )

    if status in ("SOS_TRIGGER", "SOS_TRIGGERED"):
        return (
            f"NavSafe SOS: Critical pattern on {name}'s ride ({src} to {dst}).{loc}"
        )

    if status == "HIGH_RISK":
        return (
            f"NavSafe alert: High-risk situation (off-route or vulnerable zone) on {name}'s ride "
            f"({src} to {dst}).{loc}"
        )

    if status == "MINOR_DEVIATION":
        return (
            f"NavSafe alert: Minor route deviation on {name}'s ride ({src} to {dst}).{loc}"
        )

    return None
