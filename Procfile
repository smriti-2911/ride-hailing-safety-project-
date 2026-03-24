# Heroku / Render / Railway-style process file (run from repo root).
# Set PORT in the platform dashboard if required.
web: cd backend && PYTHONUNBUFFERED=1 gunicorn --bind 0.0.0.0:$PORT --access-logfile - --error-logfile - --capture-output wsgi:app
