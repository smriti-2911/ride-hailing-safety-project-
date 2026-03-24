"""
Production WSGI entry. The repo has both `app.py` and a package `app/`; Python
would import the package for `app:app`, which is a different Flask app (no
`/api/health`). This module loads the real application from `app.py`.
"""
import importlib.util
import os

_backend_dir = os.path.abspath(os.path.dirname(__file__))
_app_py = os.path.join(_backend_dir, "app.py")

_spec = importlib.util.spec_from_file_location("navsafe_flask_app", _app_py)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Cannot load Flask app from {_app_py}")

_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
app = _mod.app
