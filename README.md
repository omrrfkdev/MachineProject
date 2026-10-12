# 🛰️ NASA Spacecraft Telemetry Anomaly Detection System (Production Full-Stack)

An end-to-end, AI-powered system for detecting real-time anomalies in NASA spacecraft telemetry signals (SMAP/MSL benchmark dataset). The system features an **XGBoost Machine Learning Pipeline**, a **FastAPI Python Backend**, and a modern, interactive **React.js Mission Control Dashboard** built with Tailwind CSS, Recharts, and Lucide icons.

---

## 🏗️ Architecture & Highlights

```
                                  +------------------------------------+
                                  |     React 18 Frontend Dashboard    |
                                  |  (Vercel / Local http://:3000)     |
                                  +-----------------+------------------+
                                                    |
                                       REST / JSON  |  CORS Enabled
                                                    v
                                  +------------------------------------+
                                  |      FastAPI Backend Engine        |
                                  |   (Render / Railway / Local :8000) |
                                  +-----------------+------------------+
                                                    |
                                    Sliding Windows | (100 size, 5 stride)
                                                    v
                                  +------------------------------------+
                                  |    Trained ML Pipeline (.pkl)      |
                                  |  - StatisticalFeatureExtractor     |
                                  |    (250 stats + 54 OHE channels)   |
                                  |  - StandardScaler (304 dimensions) |
                                  |  - XGBClassifier (Probability)     |
                                  +------------------------------------+
```

- **ML Pipeline (`models/nasa_smap_xgboost_pipeline.pkl`)**:
  - `StatisticalFeatureExtractor`: 250 statistical sliding-window features (window: 100, stride: 5) + 54 One-Hot-Encoded spacecraft channel features = **304 features**.
  - `StandardScaler`: Normalizes 304 feature dimensions.
  - `XGBClassifier`: Classifies anomalous intervals and computes continuous probability scores.
- **FastAPI REST Backend (`backend/app/main.py`)**:
  - `GET /api/health`: Health status, model verification, feature count.
  - `POST /api/predict`: Telemetry file upload (`.npy`) returning anomaly sequences, ratios, and health status (with 50MB guard & memory protection).
  - `GET /api/samples`: List available SMAP/MSL benchmark channels.
  - `POST /api/sample/{channel}`: 1-click test channel evaluation.
- **NASA Mission Control Frontend (`frontend/src/`)**:
  - Dark glassmorphic mission control interface.
  - Drag-and-drop `.npy` telemetry channel upload.
  - Recharts time-series chart highlighting anomalous regions in **RED** with zoom/pan brush slider.
  - Diagnostic KPI status cards (`NORMAL`, `WARNING`, `CRITICAL ANOMALY`).
  - Sequence anomaly details table with exportable JSON report.

---

## 📁 Repository Directory Structure

```text
NASA_Spacecraft_Anomaly_Detection/
├── .dockerignore                               # Lean Docker build filter
├── .gitignore                                  # Git ignore rules (Python, Node, build)
├── Dockerfile                                  # Production container specification (libgomp1 + FastAPI)
├── Procfile                                    # Railway/Heroku web process definition
├── render.yaml                                 # Render.com Infrastructure-as-Code deployment blueprint
├── README.md                                   # Project documentation
├── models/
│   └── nasa_smap_xgboost_pipeline.pkl          # Trained XGBoost Pipeline (304 features)
├── archive/
│   ├── labeled_anomalies.csv                   # Ground-truth anomaly labels
│   └── data/data/test/                         # 82+ SMAP/MSL benchmark .npy channel files
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                             # FastAPI endpoints & Lifespan loader
│   │   ├── feature_extraction.py               # StatisticalFeatureExtractor & sliding windows
│   │   └── predictor.py                        # Pipeline inference & sequence aggregator
│   ├── requirements.txt                        # Pinned dependencies (scikit-learn 1.6.1 + FastAPI)
│   ├── run.py                                  # Local development server launcher
│   ├── asgi.py                                 # ASGI production entrypoint
│   └── wsgi.py                                 # WSGI compatibility entrypoint
└── frontend/
    ├── vercel.json                             # Vercel SPA routing & security headers
    ├── .env.development                        # Points to http://localhost:8000/api
    ├── .env.production                         # Points to production backend API URL
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   └── index.html                          # Public HTML template with SVG favicon
    └── src/
        ├── config.js                           # Centralized API URL configuration
        ├── components/
        │   ├── UploadChannel.js                # Dropzone & channel picker
        │   ├── TelemetryChart.js               # Time-series chart with RED anomaly highlights
        │   ├── MetricsSummary.js               # KPI diagnostic status cards
        │   └── AnomalyTable.js                 # Detected anomaly sequences table
        ├── App.js                              # Main dashboard view
        ├── index.js
        └── index.css                           # Tailwind directives & glassmorphic styling
```

---

## 💻 Local Quick Start

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch development server:
   ```bash
   python run.py
   ```
   The backend will be live on **`http://localhost:8000`**.
   - Interactive Swagger API docs: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/api/health`

---

### 2. Frontend Setup (React.js)

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm start
   ```
   The dashboard will open automatically at **`http://localhost:3000`**.

---

## 🌐 Deploy to Production (Vercel + Render / Railway)

Because the ML model is 64MB and requires Python/XGBoost, the optimal production architecture is:
- **Frontend** hosted on **Vercel** (Global Edge CDN, instantaneous builds)
- **Backend** hosted on **Render** or **Railway** (free Python tier, persistent process)

---

### Step A: Deploy Backend on Render (Free)

1. Push your repository to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: NASA spacecraft anomaly detection production setup"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

2. Go to **[Render.com](https://render.com)** and sign in with GitHub.
3. Click **New +** -> **Web Service** -> Connect your GitHub repository.
4. Fill in the deployment settings:
   - **Name**: `nasa-anomaly-api`
   - **Root Directory**: `backend` (or leave blank if using Dockerfile)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
   - *(Alternatively, choose **Docker** runtime and Render will use the included `Dockerfile` automatically!)*
5. Under **Environment Variables**, add:
   - `ALLOWED_ORIGINS`: `*` (or your Vercel URL once deployed)
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://nasa-anomaly-api.onrender.com`).

---

### Step B: Deploy Frontend on Vercel

1. Go to **[Vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **Add New...** -> **Project** -> Select your repository.
3. In the configuration screen:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: Click `Edit` and select `frontend`
4. Expand **Environment Variables** and add:
   - `REACT_APP_API_URL`: `https://<YOUR-RENDER-BACKEND-URL>/api`
     *(Example: `https://nasa-anomaly-api.onrender.com/api`)*
5. Click **Deploy**.
6. Vercel will build and assign you a live production URL (e.g., `https://nasa-telemetry-anomaly-dashboard.vercel.app`).

---

## 🧪 Verification & Health Diagnostics

Once deployed, verify the full stack:

1. **Backend Health Check**:
   ```bash
   curl https://<YOUR-BACKEND-URL>/api/health
   ```
   Expected response:
   ```json
   {
     "status": "HEALTHY",
     "backend": "FastAPI",
     "pipeline_loaded": true,
     "pipeline_steps": ["features", "scaler", "model"],
     "total_features": 304
   }
   ```

2. **Frontend Mission Control**:
   - Open your Vercel URL in your browser.
   - The top navigation bar should display a green badge: `BACKEND ONLINE`.
   - The default channel `T-1.npy` will load automatically with interactive anomaly intervals highlighted in **RED**.
   - Click any benchmark channel (`P-1`, `A-1`, `S-1`, `E-1`, `E-2`) or drag-and-drop a `.npy` file to trigger real-time inference.
   - Click **EXPORT REPORT (JSON)** to download the diagnostic report.
