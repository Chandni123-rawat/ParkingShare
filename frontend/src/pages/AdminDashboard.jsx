import { lazy, Suspense } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { Activity, ChartNoAxesCombined, CircleParking, ClipboardList, CreditCard, Flag, Users } from "lucide-react";
import { formatMoney } from "../services/discovery";
import { useAdminData } from "../services/adminData";
import { AdminUsers, AdminListings, AdminBookings, AdminPayments, AdminListingReports } from "../components/AdminManagement";
import "./admin.css";

const AdminAnalytics = lazy(() => import("../components/AdminAnalytics"));
const sections = [
    ["overview", "Overview", Activity, Overview],
    ["users", "Users", Users, AdminUsers],
    ["listings", "Listings", CircleParking, AdminListings],
    ["reports", "Listing reports", Flag, AdminListingReports],
    ["bookings", "Bookings", ClipboardList, AdminBookings],
    ["payments", "Payments", CreditCard, AdminPayments],
    ["analytics", "Analytics", ChartNoAxesCombined, Analytics],
];

export default function AdminDashboard() {
    const [params] = useSearchParams();
    const [current, label, , View] = sections.find(section => section[0] === params.get("tab")) || sections[0];
    return <main className="admin-workspace">
        <aside className="admin-sidebar"><nav aria-label="Admin workspace">
            {sections.map(([key, name, Icon]) => <Link key={key} to={key === "overview" ? "/admin" : `/admin?tab=${key}`}
                className={current === key ? "admin-nav-selected" : ""} aria-current={current === key ? "page" : undefined}><Icon size={18} aria-hidden="true" />{name}</Link>)}
        </nav></aside>
        <div className="admin-content">
            <header className="admin-header"><div><p>ParkShare administration</p><h1>{current === "overview" ? "Admin dashboard" : label}</h1></div></header>
            <View key={current} />
        </div>
    </main>;
}

function Overview() {
    const { data, error, reload } = useAdminData("/admin/overview");
    const o = data?.overview;
    const metrics = o && [
        ["Total registered users", o.users.total], ["Parking owners", o.users.owners + o.users.both_roles],
        ["Parking seekers", o.users.seekers + o.users.both_roles], ["Total parking listings", o.parkings.total],
        ["Active parking listings", o.parkings.active], ["Pending approval listings", o.parkings.pending],
        ["Total bookings", o.bookings.total], ["Completed bookings", o.bookings.completed], ["Cancelled bookings", o.bookings.cancelled],
        ["Total platform revenue", formatMoney(o.revenue)]
    ];
    return <>
        <div className="admin-actions"><button type="button" className="owner-secondary" onClick={reload}>Refresh overview</button>
            <NavLink className="owner-secondary" to="/admin?tab=listings">Review listings</NavLink>
            <NavLink className="owner-secondary" to="/admin?tab=analytics">View analytics</NavLink></div>
        {error && <p className="notice error" role="alert">{error}</p>}
        {!o && !error && <p role="status">Loading platform overview…</p>}
        {o && <>
            <div className="admin-metrics" aria-label="Admin dashboard statistics">{metrics.map(([title,value]) => <article key={title} className="admin-panel">
                <span>{title}</span><strong>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</strong></article>)}</div>
            <section className="admin-panel"><h2>Payment summary</h2><p>Platform revenue is the commission recorded on completed settlements.</p>
                <dl className="booking-fields"><div><dt>Successful payment volume</dt><dd>{formatMoney(o.payments.successful_amount)}</dd></div>
                    <div><dt>Successful payment records</dt><dd>{o.payments.successful_count}</dd></div>
                    <div><dt>Pending payment records</dt><dd>{o.payments.pending_count}</dd></div>
                    <div><dt>Failed payment records</dt><dd>{o.payments.failed_count}</dd></div>
                    <div><dt>Refunded payment volume</dt><dd>{formatMoney(o.payments.refunded_amount)}</dd></div></dl></section>
        </>}
    </>;
}

function Analytics() {
    const { data, error } = useAdminData("/admin/analytics");
    if (error) return <p className="notice error" role="alert">{error}</p>;
    if (!data) return <p role="status">Loading analytics…</p>;
    return <Suspense fallback={<p role="status">Loading charts…</p>}><AdminAnalytics analytics={data} /></Suspense>;
}
