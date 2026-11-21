import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, CalendarClock, CalendarDays, CircleParking, ListChecks, Wallet } from "lucide-react";
import api from "../services/api";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const colors = ["#17664d", "#347798", "#add4bc", "#c27826", "#696c9b", "#9f4d57", "#7b8977", "#88a7a0"];
const metrics = [
    ["total_spaces", "Total parking spaces", CircleParking],
    ["active_listings", "Active listings", ListChecks],
    ["total_bookings", "Total bookings", CalendarDays],
    ["pending_bookings", "Pending bookings", CalendarClock],
    ["completed_bookings", "Completed bookings", CalendarCheck],
    ["total_earnings", "Total earnings", Wallet],
];
const label = status => status.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());

export default function OwnerDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        api.get("/parking/owner/dashboard").then(({ data }) => setDashboard(data.dashboard))
            .catch(error => setError(error.response?.data?.message || "Unable to load your dashboard."));
    }, []);

    const monthly = dashboard?.monthly.map(row => ({ ...row,
        label: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(new Date(row.month + "-01T00:00:00Z"))
    }));
    const statuses = dashboard?.status_distribution.map(row => ({ ...row, name: label(row.status) }));

    return <>
        <header className="owner-heading"><div><h1>Owner dashboard</h1><p>Track listings, reservations and net earnings.</p></div>
            <Link className="primary" to="/my-parkings/new">Add parking</Link></header>
        {error && <p role="alert" className="notice error">{error}</p>}
        {!dashboard && !error && <p role="status">Loading dashboard…</p>}
        {dashboard && <>
            <section className="owner-metrics" aria-label="Owner dashboard statistics">
                {metrics.map(([key, name, Icon]) => <div className="owner-panel owner-metric" key={key}>
                    <Icon size={21} aria-hidden="true" /><span>{name}</span>
                    <strong>{key === "total_earnings" ? currency.format(dashboard[key]) : dashboard[key]}</strong>
                </div>)}
            </section>
            <div className="owner-charts">
                <section className="owner-panel"><h2>Monthly bookings</h2>
                    <p>By reservation date · last six months</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={monthly} margin={{ left: -12, right: 10, top: 8 }}>
                            <CartesianGrid vertical={false} stroke="#e2ebe5" /><XAxis dataKey="label" /><YAxis allowDecimals={false} />
                            <Tooltip /><Bar name="Bookings" dataKey="bookings" fill={colors[0]} radius={[5, 5, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </section>
                <section className="owner-panel"><h2>Monthly earnings</h2>
                    <p>Net settlements by month · last six months</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={monthly} margin={{ right: 12, top: 8 }}>
                            <CartesianGrid vertical={false} stroke="#e2ebe5" /><XAxis dataKey="label" /><YAxis tickFormatter={value => `₹${value}`} />
                            <Tooltip formatter={value => currency.format(value)} /><Line name="Earnings" dataKey="earnings" stroke={colors[1]} strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </section>
                <section className="owner-panel"><h2>Booking status distribution</h2>
                    {statuses.length === 0 ? <p>No bookings yet. Status totals will appear here.</p> : <div className="owner-distribution">
                        <ResponsiveContainer width="100%" height={194}>
                            <PieChart><Pie data={statuses} dataKey="count" nameKey="name" innerRadius={43} outerRadius={76}>
                                {statuses.map((item, index) => <Cell key={item.status} fill={colors[index % colors.length]} />)}
                            </Pie><Tooltip /></PieChart>
                        </ResponsiveContainer>
                        <ul>{statuses.map((item, index) => <li key={item.status}><span style={{ background: colors[index % colors.length] }} aria-hidden="true" />{item.name} <strong>{item.count}</strong></li>)}</ul>
                    </div>}
                </section>
            </div>
        </>}
    </>;
}
