# Heroku / Render / Railway-style process file (run from repo root).
# Set PORT in the platform dashboard if required.
# --timeout 120: safety-score (Maps + grid + ML) often exceeds Gunicorn default 30s on cold/slow tier
web: cd backend && PYTHONUNBUFFERED=1 gunicorn --bind 0.0.0.0:$PORT --timeout 120 --graceful-timeout 30 --access-logfile - --error-logfile - --capture-output wsgi:app
