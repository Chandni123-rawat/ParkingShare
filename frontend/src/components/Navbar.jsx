import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, SquareParking } from "lucide-react";
import api from "../services/api";
import { useNotifications } from "../services/notificationFeed";
import { dashboardPath, useSession } from "../services/session";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, clear } = useSession();
    const { count: unread, setCount: setUnread } = useNotifications();
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState("");


    async function logout() {
        setLoggingOut(true);
        setLogoutError("");
        try {
            await api.post("/auth/logout", { refreshToken: localStorage.getItem("refreshToken") });
            clear();
            setUnread(0);
            navigate("/login", { replace: true, state: { message: "You signed out." } });
        } catch {
            setLogoutError("Unable to sign out. Please try again.");
        } finally {
            setLoggingOut(false);
        }
    }

    return <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation">
            <Link to="/" className="brand"><SquareParking aria-hidden="true" /> ParkShare</Link>
            <div className="nav-links">
                <NavLink to="/" end>Find parking</NavLink>
                {user && <>
                    <NavLink to={dashboardPath(user.role)}>Dashboard</NavLink>
                    {["owner", "both"].includes(user.role) && <>
                        <NavLink to="/my-parkings">My spaces</NavLink>
                        <NavLink to="/owner/bookings">Owner bookings</NavLink>
                    </>}
                    <NavLink to="/my-bookings">My bookings</NavLink>
                    <NavLink to="/my-vehicles">Vehicles</NavLink>
                    <NavLink to="/notifications" className="nav-notifications"><Bell size={16} aria-hidden="true" />Notifications
                        {unread > 0 && <span className="notification-badge" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}</NavLink>
                    <NavLink to="/profile">Profile</NavLink>
                    <button className="text-button" type="button" onClick={logout} disabled={loggingOut}>
                        {loggingOut ? "Signing out…" : "Sign out"}
                    </button>
                </>}
                {!user && <>
                    <NavLink to="/login">Sign in</NavLink>
                    <Link className="primary" to="/register">Get started</Link>
                </>}
            </div>
        </nav>
        {logoutError && <p className="notice error" role="alert">{logoutError}</p>}
    </header>;
}
