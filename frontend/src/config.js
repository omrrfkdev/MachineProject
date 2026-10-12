/**
 * Central API configuration.
 * All components import from here — never hardcode the URL anywhere else.
 *
 * In development:  reads REACT_APP_API_URL from .env.development → http://localhost:8000/api
 * In production:   reads REACT_APP_API_URL from .env.production  → your deployed backend URL
 */
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export default API_BASE_URL;
