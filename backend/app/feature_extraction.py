import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder

class StatisticalFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Custom transformer extracting 250 time-series statistical features 
    combined with one-hot encoded channel indicators (304 features total),
    matching the trained NASA SMAP XGBoost Pipeline.
    """
    def __init__(self):
        pass

    def _extract_statistical_features(self, X):
        """
        Extracts 250 statistical features from 3D array of shape (N_windows, window_size, 25).
        """
        mean = np.mean(X, axis=1)
        std = np.std(X, axis=1)
        minimum = np.min(X, axis=1)
        maximum = np.max(X, axis=1)
        median = np.median(X, axis=1)
        signal_range = maximum - minimum
        q25 = np.percentile(X, 25, axis=1)
        q75 = np.percentile(X, 75, axis=1)
        iqr = q75 - q25
        rms = np.sqrt(np.mean(X ** 2, axis=1))

        t = np.arange(X.shape[1])
        t_centered = t - np.mean(t)
        slope = (
            np.sum(
                t_centered[None, :, None] * (X - mean[:, None, :]),
                axis=1
            )
            / np.sum(t_centered ** 2)
        )

        differences = np.diff(X, axis=1)
        mean_abs_diff = np.mean(np.abs(differences), axis=1)

        features = np.concatenate(
            [
                mean,
                std,
                minimum,
                maximum,
                median,
                signal_range,
                iqr,
                rms,
                slope,
                mean_abs_diff
            ],
            axis=1
        )
        return features

    def fit(self, X, y=None):
        channels = X["channel"].to_numpy().reshape(-1, 1)
        self.encoder_ = OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False
        )
        self.encoder_.fit(channels)
        return self

    def transform(self, X):
        windows = np.stack(X["window"].to_numpy())
        channels = X["channel"].to_numpy().reshape(-1, 1)
        statistical_features = self._extract_statistical_features(windows)
        channel_features = self.encoder_.transform(channels)
        combined_features = np.hstack([statistical_features, channel_features])
        return combined_features


def prepare_sliding_windows(data: np.ndarray, channel_name: str = "T-1", window_size: int = 100, stride: int = 5):
    """
    Prepares input DataFrame for pipeline inference using sliding windows.
    
    Parameters:
    -----------
    data : np.ndarray
        Raw signal array of shape (N, 25) or (N,).
    channel_name : str
        Name of spacecraft telemetry channel (e.g., 'T-1', 'P-1', 'A-1').
    window_size : int
        Size of window (default: 100).
    stride : int
        Step size (default: 5).
        
    Returns:
    --------
    df_windows : pd.DataFrame
        DataFrame with columns ['window', 'channel'].
    window_indices : list of tuples
        List of (start_idx, end_idx) for each window.
    primary_signal : list of float
        Single 1D time-series signal for frontend charting.
    """
    # Standardize data shape to (N, 25)
    if data.ndim == 1:
        primary_signal = data.tolist()
        data = np.tile(data[:, np.newaxis], (1, 25))
    elif data.ndim == 2:
        primary_signal = data[:, 0].tolist()
        if data.shape[1] < 25:
            pad_cols = 25 - data.shape[1]
            data = np.pad(data, ((0, 0), (0, pad_cols)), mode='edge')
        elif data.shape[1] > 25:
            data = data[:, :25]
    else:
        raise ValueError(f"Invalid telemetry signal dimensions: {data.ndim}. Expected 1D or 2D array.")

    num_samples, _ = data.shape
    if num_samples < window_size:
        pad_size = window_size - num_samples
        data = np.pad(data, ((0, pad_size), (0, 0)), mode='edge')
        num_samples = window_size

    clean_channel = channel_name.replace(".npy", "").strip() if channel_name else "T-1"

    windows = []
    window_indices = []
    num_windows = (num_samples - window_size) // stride + 1

    for i in range(num_windows):
        start_idx = i * stride
        end_idx = start_idx + window_size
        window = data[start_idx:end_idx, :]
        windows.append(window)
        window_indices.append((start_idx, end_idx))

    df_windows = pd.DataFrame({
        "window": windows,
        "channel": [clean_channel] * len(windows)
    })

    return df_windows, window_indices, primary_signal
