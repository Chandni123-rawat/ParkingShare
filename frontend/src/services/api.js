
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:15053/api",
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");

        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Let the browser/Axios set the correct multipart boundary
        // for FormData requests.
        if (
            typeof FormData !== "undefined" &&
            config.data instanceof FormData
        ) {
            delete config.headers["Content-Type"];
        } else if (config.data && !config.headers["Content-Type"]) {
            config.headers["Content-Type"] = "application/json";
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;