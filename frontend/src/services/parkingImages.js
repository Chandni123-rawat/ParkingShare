import api from "./api";

export function parkingImageUrl(url) {
    if (!url?.startsWith("/api/parking/images/")) return url;
    const base = new URL(api.defaults.baseURL, window.location.href);
    return new URL(url, base.origin).href;
}
