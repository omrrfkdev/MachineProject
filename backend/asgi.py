import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

# ASGI callable for production servers (Uvicorn / Hypercorn / Gunicorn -k uvicorn.workers.UvicornWorker)
application = app
