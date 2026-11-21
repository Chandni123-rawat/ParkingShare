import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const Session = createContext(null);
const keys = ["accessToken", "refreshToken", "user"];

export function dashboardPath(role) {
    if (role === "admin") return "/admin";
    if (role === "owner" || role === "both") return "/owner/dashboard";
    return "/seeker";
}

export function SessionProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(localStorage.getItem("accessToken")));
    const [sessionError, setSessionError] = useState("");

    function updateUser(account) {
        localStorage.setItem("user", JSON.stringify(account));
        setUser(account);
    }

    function start({ accessToken, refreshToken, user: account }) {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        setSessionError("");
        updateUser(account);
    }

    function clear() {
        keys.forEach((key) => localStorage.removeItem(key));
        setUser(null);
        setSessionError("");
    }

    useEffect(() => {
        let canceled = false;
        const originalToken = localStorage.getItem("accessToken");
        async function restore() {
            if (!originalToken) return;
            try {
                let result;
                try {
                    result = await api.get("/users/me");
                } catch (error) {
                    const refreshToken = localStorage.getItem("refreshToken");
                    if (error.response?.status !== 401 || !refreshToken) throw error;
                    const refresh = await api.post("/auth/refresh", { refreshToken });
                    if (canceled || localStorage.getItem("accessToken") !== originalToken) return;
                    result = await api.get("/users/me", {
                        headers: { Authorization: `Bearer ${refresh.data.accessToken}` }
                    });
                    if (canceled || localStorage.getItem("accessToken") !== originalToken) return;
                    localStorage.setItem("accessToken", refresh.data.accessToken);
                }
                if (!canceled && localStorage.getItem("refreshToken")) updateUser(result.data.user);
            } catch (error) {
                if (canceled || localStorage.getItem("accessToken") !== originalToken) return;
                if (error.response?.status === 401) clear();
                else setSessionError("Could not validate your session. Reload the page to try again.");
            } finally {
                if (!canceled) setLoading(false);
            }
        }
        restore();
        return () => { canceled = true; };
    }, []);

    return <Session.Provider value={{ user, loading, sessionError, start, clear, updateUser }}>{children}</Session.Provider>;
}

export function useSession() {
    return useContext(Session);
}
