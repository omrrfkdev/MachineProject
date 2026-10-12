import io
import os
import glob
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.predictor import get_predictor

# ---------------------------------------------------------------------------
# Lifespan: eagerly load the model pipeline at server startup (no cold-start
# latency on the first real request).
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 NASA Anomaly Detection API starting up — loading ML pipeline...")
    try:
        get_predictor()  # warm the singleton on startup
        print("✅ ML pipeline loaded and ready.")
    except Exception as e:
        print(f"❌ WARNING: ML pipeline failed to load: {e}")
    yield
    print("🛑 NASA Anomaly Detection API shutting down.")


app = FastAPI(
    title="NASA Spacecraft Telemetry Anomaly Detection API",
    description="Production-grade AI anomaly detection for NASA SMAP/MSL spacecraft telemetry using XGBoost Pipeline.",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow origins from env variable (comma-separated) with a safe default
# for local development. Set ALLOWED_ORIGINS env var in production.
# Example: ALLOWED_ORIGINS=https://nasa-dashboard.vercel.app,http://localhost:3000
# ---------------------------------------------------------------------------
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_test_data_dir() -> str | None:
    """Resolve the test-data directory relative to this file (cross-platform)."""
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    candidate = os.path.join(project_root, "archive", "data", "data", "test")
    return candidate if os.path.isdir(candidate) else None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "service": "NASA Spacecraft Telemetry Anomaly Detection API",
        "status": "online",
        "version": "2.0.0",
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict (POST .npy file)",
            "samples": "/api/samples (GET benchmark channels)",
            "sample_predict": "/api/sample/{channel_name} (POST)",
        },
    }


@app.get("/api/health")
def health_check():
    try:
        predictor = get_predictor()
        pipeline = predictor.pipeline
        return {
            "status": "HEALTHY",
            "backend": "FastAPI",
            "pipeline_loaded": pipeline is not None,
            "pipeline_steps": list(pipeline.named_steps.keys()),
            "total_features": getattr(
                pipeline.named_steps.get("scaler"), "n_features_in_", 304
            ),
        }
    except Exception as e:
        return {"status": "UNHEALTHY", "error": str(e)}


@app.post("/api/predict")
async def predict_file(file: UploadFile = File(...)):
    """Upload a .npy telemetry file and receive anomaly prediction results."""
    if not file.filename.endswith(".npy"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .npy telemetry files are supported.",
        )

    # --- Read and size-guard the uploaded file ---
    MAX_BYTES = 50 * 1024 * 1024  # 50 MB hard limit
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum allowed size is 50 MB.",
        )

    try:
        buffer = io.BytesIO(contents)
        # allow_pickle=False is safer; NASA .npy files are plain arrays
        try:
            raw_data = np.load(buffer, allow_pickle=False)
        except ValueError:
            # Fallback for legacy object arrays (e.g. structured arrays)
            buffer.seek(0)
            raw_data = np.load(buffer, allow_pickle=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse numpy array from uploaded file: {str(e)}",
        )

    channel_name = file.filename.replace(".npy", "")

    try:
        predictor = get_predictor()
        result = predictor.predict(raw_data, channel_name=channel_name)
        result["filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Anomaly inference failed: {str(e)}"
        )


@app.get("/api/samples")
def list_sample_channels():
    """Returns available test channels from the bundled SMAP/MSL dataset directory."""
    test_dir = _get_test_data_dir()
    if test_dir:
        npy_files = sorted(glob.glob(os.path.join(test_dir, "*.npy")))
        if npy_files:
            return {"samples": [os.path.basename(f) for f in npy_files]}

    # Fallback: well-known SMAP benchmark channels
    return {
        "samples": [
            "T-1.npy", "P-1.npy", "A-1.npy", "S-1.npy",
            "E-1.npy", "E-2.npy", "E-3.npy", "D-1.npy",
        ]
    }


@app.post("/api/sample/{channel_name}")
def predict_sample_channel(channel_name: str):
    """Executes prediction on a bundled SMAP/MSL benchmark channel."""
    if not channel_name.endswith(".npy"):
        channel_name += ".npy"

    # Sanitise path traversal attempts
    channel_name = os.path.basename(channel_name)

    test_dir = _get_test_data_dir()
    if test_dir is None:
        raise HTTPException(
            status_code=503,
            detail="Benchmark dataset not available on this server.",
        )

    sample_path = os.path.join(test_dir, channel_name)
    if not os.path.isfile(sample_path):
        raise HTTPException(
            status_code=404,
            detail=f"Sample channel '{channel_name}' not found.",
        )

    try:
        raw_data = np.load(sample_path, allow_pickle=False)
    except ValueError:
        raw_data = np.load(sample_path, allow_pickle=True)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load channel file '{channel_name}': {str(e)}",
        )

    try:
        predictor = get_predictor()
        result = predictor.predict(raw_data, channel_name=channel_name)
        result["filename"] = channel_name
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed on channel {channel_name}: {str(e)}",
        )
