import { Navigate, useLocation } from "react-router-dom";
import { dashboardPath, useSession } from "../services/session";

export default function ProtectedRoute({ children, allowedRoles }) {
    const location = useLocation();
    const { user, loading, sessionError } = useSession();
    if (loading) return <p className="route-status" role="status">Checking your session…</p>;
    if (sessionError) return <p className="route-status" role="alert">{sessionError}</p>;
    if (!user) return <Navigate to="/login" replace state={{ returnTo: location }} />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={dashboardPath(user.role)} replace />;
    }
    return children;
}
