import os
import sys
import joblib
import numpy as np
from app.feature_extraction import StatisticalFeatureExtractor, prepare_sliding_windows

# Ensure StatisticalFeatureExtractor is accessible in __main__ scope for unpickling
setattr(sys.modules["__main__"], "StatisticalFeatureExtractor", StatisticalFeatureExtractor)


class TelemetryPredictor:
    def __init__(self, model_path: str = None):
        if model_path is None:
            # Resolve model path relative to this file (works on any OS)
            base_dir = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            model_path = os.path.join(base_dir, "models", "nasa_smap_xgboost_pipeline.pkl")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"NASA XGBoost Pipeline model not found at: {model_path}"
            )

        print(f"Loading NASA SMAP XGBoost Pipeline from {model_path}...")
        self.pipeline = joblib.load(model_path)
        print("Pipeline model loaded successfully.")

    def predict(self, raw_data: np.ndarray, channel_name: str = "T-1") -> dict:
        """
        Runs full pipeline inference on an uploaded / server-side telemetry signal.

        Parameters
        ----------
        raw_data : np.ndarray
            Raw telemetry array of shape (N,) or (N, 25).
        channel_name : str
            Telemetry channel identifier (e.g. 'T-1', 'P-1').

        Returns
        -------
        dict
            Full prediction payload sent to the frontend.
        """
        df_windows, window_indices, primary_signal = prepare_sliding_windows(
            raw_data,
            channel_name=channel_name,
            window_size=100,
            stride=5,
        )

        # Pipeline: StatisticalFeatureExtractor → StandardScaler → XGBClassifier
        predictions = self.pipeline.predict(df_windows)

        if hasattr(self.pipeline, "predict_proba"):
            probabilities = self.pipeline.predict_proba(df_windows)[:, 1]
        else:
            probabilities = predictions.astype(float)

        total_windows = len(predictions)
        anomalous_window_count = int(np.sum(predictions))
        anomaly_ratio = (
            float((anomalous_window_count / total_windows) * 100)
            if total_windows > 0
            else 0.0
        )

        # ── Health status thresholds ──────────────────────────────────────────
        if anomaly_ratio == 0:
            health_status = "NORMAL (NOMINAL)"
            status_level = "success"
        elif anomaly_ratio < 5.0:
            health_status = "NORMAL (MINOR FLAPS)"
            status_level = "info"
        elif anomaly_ratio < 15.0:
            health_status = "WARNING (ELEVATED ANOMALIES)"
            status_level = "warning"
        else:
            health_status = "CRITICAL ANOMALY DETECTED"
            status_level = "danger"

        # ── Aggregate contiguous anomalous windows into sequences ─────────────
        anomaly_sequences = []
        in_sequence = False
        seq_start = 0
        seq_end = 0
        conf_scores: list[float] = []

        for is_anom, prob, (w_start, w_end) in zip(
            predictions, probabilities, window_indices
        ):
            if is_anom == 1:
                conf_scores.append(float(prob))
                if not in_sequence:
                    in_sequence = True
                    seq_start = w_start
                seq_end = w_end
            else:
                if in_sequence:
                    in_sequence = False
                    avg_conf = float(np.mean(conf_scores)) if conf_scores else 1.0
                    anomaly_sequences.append(
                        {
                            "start": seq_start,
                            "end": seq_end,
                            "confidence": round(avg_conf, 4),
                        }
                    )
                    conf_scores = []

        # Close any trailing open sequence
        if in_sequence:
            avg_conf = float(np.mean(conf_scores)) if conf_scores else 1.0
            anomaly_sequences.append(
                {
                    "start": seq_start,
                    "end": seq_end,
                    "confidence": round(avg_conf, 4),
                }
            )

        max_confidence = (
            float(np.max(probabilities)) if len(probabilities) > 0 else 0.0
        )

        return {
            "num_samples": len(primary_signal),
            "primary_signal": primary_signal,
            "total_windows": total_windows,
            "anomalous_windows": anomalous_window_count,
            "anomaly_ratio": round(anomaly_ratio, 2),
            "health_status": health_status,
            "status_level": status_level,
            "max_confidence": round(max_confidence, 4),
            "anomaly_sequences": anomaly_sequences,
            "window_predictions": [
                {
                    "start": w_start,
                    "end": w_end,
                    "is_anomaly": bool(pred),
                    "confidence": round(float(prob), 4),
                }
                for pred, prob, (w_start, w_end) in zip(
                    predictions, probabilities, window_indices
                )
            ],
        }


# ── Global singleton ──────────────────────────────────────────────────────────
_predictor_instance: TelemetryPredictor | None = None


def get_predictor() -> TelemetryPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = TelemetryPredictor()
    return _predictor_instance
