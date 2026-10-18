
import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api",
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Handle image uploads correctly.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      // Allow Axios to set multipart/form-data with its boundary.
      delete config.headers["Content-Type"];
    } else if (config.data !== undefined) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
