import uvicorn
import os
import sys

# Ensure the backend directory is importable
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    reload = os.environ.get("RELOAD", "true").lower() == "true"
    print(f"🚀 Launching NASA Spacecraft Telemetry Anomaly Detection API on {host}:{port}...")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
