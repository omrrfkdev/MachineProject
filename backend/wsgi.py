"""
WSGI adapter entrypoint for WSGI web servers (Gunicorn default, uWSGI, etc.)
Note: For modern asynchronous FastAPI deployment, ASGI (asgi.py) is recommended.
"""
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)
except ImportError:
    # Fallback to direct app if runner supports ASGI callable
    application = app
