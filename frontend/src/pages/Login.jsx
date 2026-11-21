import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AccountPage from "../components/AccountPage";
import api from "../services/api";
import { dashboardPath, useSession } from "../services/session";

export default function Login() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { start } = useSession();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = form.get("email");
        const password = form.get("password");
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post("/auth/login", { email, password });
            start(data);
            const requested = state?.returnTo;
            const resumeBooking = requested && /^\/booking\/create\/\d+$/.test(requested.pathname);
            navigate(resumeBooking ? { pathname: requested.pathname, search: requested.search } : dashboardPath(data.user.role), { replace: true });
        } catch (failure) {
            setError(failure.response?.data?.message || "Unable to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return <AccountPage title="Welcome back" description="Sign in to your ParkShare Lite account.">
        {state?.message && <p className="notice success" role="status">{state.message}</p>}
        <form onSubmit={submit}>
            <label>Email<input name="email" type="email" autoComplete="username" defaultValue={state?.email || ""} required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
            {error && <p className="notice error" role="alert">{error}</p>}
            <button className="primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="account-links">
            <Link to="/register">Create an account</Link>
        </div>
    </AccountPage>;
}
