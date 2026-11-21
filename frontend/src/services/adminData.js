import { useEffect, useState } from "react";
import api from "./api";

export function useAdminData(endpoint) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        api.get(endpoint, { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) { setData(data); setError(""); }
        }).catch(error => {
            if (!controller.signal.aborted) setError(error.response?.data?.message || "Unable to load this view.");
        });
        return () => controller.abort();
    }, [endpoint, revision]);
    return { data, error, reload: () => setRevision(number => number + 1) };
}

export function useAdminAction(reload) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    async function patch(endpoint, body, onSuccess) {
        setBusy(true);
        setMessage("");
        setError("");
        try {
            const { data } = await api.patch(endpoint, body);
            setMessage(data.message);
            onSuccess?.(data);
            reload();
        } catch (error) { setError(error.response?.data?.message || "The change could not be saved."); }
        finally { setBusy(false); }
    }
    return { busy, error, message, patch };
}
