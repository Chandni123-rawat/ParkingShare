import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import BookingQrScanner from "../components/BookingQrScanner";
import "./booking.css";

const archivedStatuses = ["COMPLETED", "CANCELLED", "EXPIRED", "PAYMENT_FAILED"];

function OwnerBookings({ history = false }) {
    const [bookings, setBookings] = useState([]);
    const [filter, setFilter] = useState(history ? "history" : "open");
    const [scanOpen, setScanOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [otp, setOtp] = useState({});
    const [actionLoading, setActionLoading] = useState(null);

    async function fetchBookings() {
        const { data } = await api.get("/bookings/owner");
        setBookings(data.bookings);
    }

    useEffect(() => {
        fetchBookings().catch(error => setError(error.response?.data?.message || "Unable to load bookings."))
            .finally(() => setLoading(false));
    }, []);

    async function runAction(id, action, success) {
        const code = otp[id];
        if (action === "verify-otp" && !/^\d{6}$/.test(code || "")) {
            setError("Enter the six-digit check-in code.");
            return;
        }
        setActionLoading(id);
        setError("");
        setMessage("");
        try {
            await api.patch(`/bookings/${id}/${action}`, action === "verify-otp" ? { otp: code } : {});
            await fetchBookings();
            setMessage(success);
        } catch (error) {
            setError(error.response?.data?.message || "Unable to update this booking.");
        } finally {
            setActionLoading(null);
        }
    }

    async function scan(qr) {
        setScanOpen(false);
        setActionLoading("qr");
        setError("");
        setMessage("");
        try {
            const { data } = await api.post("/bookings/owner/verify-qr", { qr });
            setMessage(`Vehicle entry recorded for booking #${data.booking.id}.`);
            await fetchBookings();
        } catch (error) {
            setError(error.response?.data?.message || "Could not verify the QR pass.");
        } finally { setActionLoading(null); }
    }

    const filters = history
        ? [["history", "All past reservations"], ["COMPLETED", "Completed"], ["CANCELLED", "Cancelled"]]
        : [["open", "Open reservations"], ["all", "All reservations"], ["CONFIRMED", "Upcoming arrivals"], ["ACTIVE", "Vehicles on site"]];
    const visibleBookings = bookings.filter(booking => {
        if (filter === "all") return true;
        if (filter === "history") return archivedStatuses.includes(booking.status);
        if (filter === "open") return !archivedStatuses.includes(booking.status);
        return booking.status === filter;
    });
    return <>
        <header className="owner-heading"><div><h1>{history ? "Booking history" : "Owner bookings"}</h1>
            <p>{history ? "Review completed, cancelled, expired and failed bookings." : "View reservations and manage check-in and checkout."}</p></div></header>
        <div className="booking-tabs" aria-label="Owner reservation filters">
            {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
            {!history && <button type="button" className="primary" disabled={actionLoading !== null || scanOpen} onClick={() => setScanOpen(true)}>Scan QR pass</button>}
        </div>
        {scanOpen && <BookingQrScanner onRead={scan} onClose={() => setScanOpen(false)} />}
        {error && <p className="notice error" role="alert">{error}</p>}
        {message && <p className="notice success" role="status">{message}</p>}
        {loading && <p role="status">Loading bookings…</p>}
        {!loading && !error && visibleBookings.length === 0 && <div className="owner-panel"><p>No reservations match this view.</p></div>}
        {visibleBookings.map(booking => <article className="owner-panel owner-booking-card" key={booking.id}>
            <div className="owner-heading"><h2>{booking.parking_title} · #{booking.id}</h2><span className="owner-status">{booking.status.replaceAll("_", " ")}</span></div>
            <dl className="owner-field-row">
                <div><dt>Reservation</dt><dd>{String(booking.date).slice(0, 10)} · {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}</dd></div>
                <div><dt>Customer</dt><dd>{booking.seeker_name}<br />{booking.seeker_email}<br />{booking.seeker_phone}</dd></div>
                <div><dt>Vehicle</dt><dd>{[booking.vehicle_number, booking.vehicle_type].filter(Boolean).join(" · ") || "Unavailable"}</dd></div>
                <div><dt>Payment</dt><dd>₹{booking.amount} · {booking.payment_status.replaceAll("_", " ")}
                    {booking.refund_status && booking.refund_status !== "NOT_REQUESTED" && ` · Refund ${booking.refund_status.toLowerCase()}`}</dd></div>
            </dl>
            <div className="owner-actions">
                <Link className="owner-secondary" to={`/booking/${booking.id}`}>View booking</Link>
                {booking.status === "CONFIRMED" && !booking.otp_verified && <>
                    <label>Check-in code<input inputMode="numeric" maxLength={6} value={otp[booking.id] || ""}
                        onChange={event => setOtp({ ...otp, [booking.id]: event.target.value })} /></label>
                    <button type="button" disabled={actionLoading !== null} onClick={() => runAction(booking.id, "verify-otp", "Code verified. Customer checked in.")}>
                        {actionLoading === booking.id ? "Verifying…" : "Verify and check in"}</button>
                </>}
                {booking.otp_verified && booking.status === "CONFIRMED" && <button type="button" className="primary"
                    disabled={actionLoading !== null} onClick={() => runAction(booking.id, "checkin", "Customer checked in.")}>Check in</button>}
                {booking.status === "ACTIVE" && <button type="button" className="primary"
                    disabled={actionLoading !== null} onClick={() => runAction(booking.id, "checkout", "Booking completed.")}>Checkout</button>}
            </div>
        </article>)}
    </>;
}

export default OwnerBookings;