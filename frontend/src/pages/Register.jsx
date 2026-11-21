import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AccountPage from "../components/AccountPage";
import api from "../services/api";

export default function Register() {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function submit(event) {
        event.preventDefault();
        const fields = Object.fromEntries(new FormData(event.currentTarget));
        setBusy(true);
        setError("");
        try {
            const { data } = await api.post("/auth/register", fields);
            navigate("/login", { replace: true, state: { email: fields.email, message: data.message } });
        } catch (error) {
            setError(error.response?.data?.message || "Could not create your account.");
        } finally { setBusy(false); }
    }
    return <AccountPage title="Create an account" description="Choose how you want to use ParkShare.">
        <form onSubmit={submit}>
            <label>Full name<input name="name" required autoComplete="name" /></label>
            <label>Email<input name="email" type="email" required autoComplete="email" /></label>
            <label>Phone<input name="phone" type="tel" required autoComplete="tel" /></label>
            <label>Password<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
            <label>Account type<select name="role"><option value="seeker">Parking Seeker</option><option value="owner">Parking Owner</option></select></label>
            {error && <p className="notice error" role="alert">{error}</p>}
            <button className="primary" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>
        <Link to="/login">Already registered? Sign in</Link>
    </AccountPage>;
}