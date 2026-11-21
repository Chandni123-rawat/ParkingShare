import { useState } from "react";
import { formatMoney, vehicleNames } from "../services/discovery";
import { useAdminAction, useAdminData } from "../services/adminData";
import { AdminDialog, AdminTable, DetailsGrid, displayTime, ListingPhotos, matches, StatusTag } from "./AdminData";

function Feedback({ error, message, loading }) {
    return <>
        {error && <p className="notice error" role="alert">{error}</p>}
        {message && <p className="notice success" role="status">{message}</p>}
        {loading && <p role="status">Loading records…</p>}
    </>;
}

export function AdminUsers() {
    const { data, error, reload } = useAdminData("/admin/users");
    const [query, setQuery] = useState("");
    const [role, setRole] = useState("");
    const [selected, select] = useState(null);
    const users = data?.users.filter(user => matches(query, user.name, user.email, user.phone) &&
        (!role || user.role === role || user.role === "both" && ["owner","seeker"].includes(role)));

    return <section className="admin-panel"><h2>Registered users</h2>
        <div className="admin-filters">
            <label>Search users<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, email or phone" /></label>
            <label>Role<select value={role} onChange={e => setRole(e.target.value)}>
                <option value="">All roles</option><option value="seeker">Parking seekers</option>
                <option value="owner">Parking owners</option><option value="admin">Admin</option></select></label>
        </div>
        <Feedback error={error} loading={!data && !error} />
        {users && <AdminTable rows={users} columns={[
            ["Name", row => <strong>{row.name}</strong>], ["Email", row => row.email], ["Role", row => <StatusTag>{row.role}</StatusTag>],
            ["Account", row => <StatusTag>{row.account_status}</StatusTag>], ["Verified", row => row.verification_status],
            ["Details", row => <button type="button" onClick={() => select(row.id)}>View user</button>]
        ]} />}
        {selected && <UserDetails id={selected} close={() => select(null)} onChange={reload} />}
    </section>;
}

function UserDetails({ id, close, onChange }) {
    const { data, error, reload } = useAdminData(`/admin/users/${id}`);
    const action = useAdminAction(() => { reload(); onChange(); });
    const user = data?.user;
    return <AdminDialog title={user?.name || "User details"} onClose={close}>
        <Feedback error={error || action.error} message={action.message} loading={!data && !error} />
        {user && <>
            <DetailsGrid entries={[["Email",user.email],["Phone",user.phone],["Role",user.role],
                ["Account",<StatusTag key="account-status">{user.account_status}</StatusTag>],["Verification",user.verification_status],
                ["Registered",displayTime(user.created_at)],["Bookings",user.booking_count],["Listings",user.listing_count],
                ["Bio",user.bio || "—"]]} />
            {user.role !== "admin" && <button className="primary" type="button" disabled={action.busy}
                onClick={() => action.patch(`/admin/users/${id}/status`, { active: user.account_status === "DEACTIVATED" })}>
                {user.account_status === "DEACTIVATED" ? "Activate account" : "Deactivate account"}</button>}
        </>}
    </AdminDialog>;
}

function listingState(row) {
    if (row.archived_at) return "ARCHIVED";
    if (row.admin_deactivated_at) return "ADMIN DEACTIVATED";
    if (row.owner_account_status !== "ACTIVE") return "OWNER INACTIVE";
    return row.is_available && row.approval_status === "APPROVED" ? "ACTIVE" : "INACTIVE";
}

export function AdminListings() {
    const { data, error, reload } = useAdminData("/admin/parkings");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("");
    const [selected, select] = useState(null);
    const listing = data?.parkings.find(row => row.id === selected);
    const rows = data?.parkings.filter(row => matches(query, row.title, row.address, row.owner_name) &&
        (!filter || row.approval_status === filter && !row.archived_at || listingState(row) === filter));
    return <section className="admin-panel">
        <h2>Parking listings</h2>
        <div className="admin-filters"><label>Search listings<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, address or owner" /></label>
            <label>Listing status<select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="">All listings</option>{["PENDING","APPROVED","REJECTED","ACTIVE","ADMIN DEACTIVATED","ARCHIVED"].map(value =>
                    <option key={value} value={value}>{value}</option>)}</select></label></div>
        <Feedback error={error} loading={!data && !error} />
        {rows && <AdminTable rows={rows} columns={[
            ["Listing", row => <><strong>{row.title}</strong><small>{row.address}</small></>],["Owner", row => row.owner_name],
            ["Hourly rate", row => formatMoney(row.price_per_hour)],["Approval", row => <StatusTag>{row.approval_status}</StatusTag>],
            ["Availability", row => <StatusTag>{listingState(row)}</StatusTag>],
            ["Details", row => <button type="button" onClick={() => select(row.id)}>Review listing</button>]
        ]} />}
        {listing && <ListingDetails key={listing.id} listing={listing} close={() => select(null)} reload={reload} />}
    </section>;
}

function ListingDetails({ listing, close, reload }) {
    const action = useAdminAction(reload);
    const [reason, setReason] = useState("");
    const base = `/admin/parkings/${listing.id}`;
    return <AdminDialog title={listing.title} onClose={close}>
        <DetailsGrid entries={[["Owner",listing.owner_name],["Address",listing.address],["Hourly rate",formatMoney(listing.price_per_hour)],
            ["Capacity",listing.capacity],["Vehicles",vehicleNames(listing.vehicle_types)],["Approval",listing.approval_status],
            ["Availability",listingState(listing)],["Coordinates",listing.latitude == null ? "—" : `${listing.latitude}, ${listing.longitude}`]]} />
        <p>{listing.description || "No description provided."}</p>
        {listing.rejection_reason && <p>Rejection reason: {listing.rejection_reason}</p>}
        <ListingPhotos listing={listing} />
        <Feedback error={action.error} message={action.message} />
        {!listing.archived_at && <div className="admin-actions">
            {listing.approval_status === "PENDING" && <button type="button" disabled={action.busy} onClick={() => action.patch(base + "/approve")}>Approve listing</button>}
            <button type="button" disabled={action.busy} onClick={() => action.patch(base + "/status", { active: Boolean(listing.admin_deactivated_at) })}>
                {listing.admin_deactivated_at ? "Lift admin block" : "Deactivate listing"}</button>
        </div>}
        {!listing.archived_at && listing.approval_status === "PENDING" && <form className="admin-form" onSubmit={e => {
            e.preventDefault(); action.patch(base + "/reject", { reason: reason.trim() });
        }}><label>Rejection reason<textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
            <button type="submit" disabled={action.busy || !reason.trim()}>Reject listing</button></form>}
    </AdminDialog>;
}

export function AdminBookings() {
    const { data, error } = useAdminData("/admin/bookings");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("");
    const [selected, select] = useState(null);
    const rows = data?.bookings.filter(row => (!filter || row.status === filter) &&
        matches(query, row.id, row.parking_title, row.seeker_name, row.seeker_email, row.owner_name));
    return <section className="admin-panel"><h2>All reservations</h2>
        <div className="admin-filters"><label>Search bookings<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Booking ID, parking or customer" /></label>
            <label>Booking status<select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="">All statuses</option>{[...new Set(data?.bookings.map(b => b.status))].sort().map(status =>
                    <option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select></label></div>
        <Feedback error={error} loading={!data && !error} />
        {rows && <AdminTable rows={rows} columns={[
            ["Booking", row => `#${row.id}`],["Parking", row => row.parking_title],["Customer", row => row.seeker_name],
            ["Date", row => row.date],["Total", row => formatMoney(row.amount)],["Status", row => <StatusTag>{row.status}</StatusTag>],
            ["Details", row => <button type="button" onClick={() => select(row.id)}>View booking</button>]
        ]} />}
        {selected && <AdminBookingDetails id={selected} close={() => select(null)} />}
    </section>;
}

function AdminBookingDetails({ id, close }) {
    const { data, error } = useAdminData(`/admin/bookings/${id}`);
    const booking = data?.booking;
    return <AdminDialog onClose={close} title={`Booking #${id}`}>
        <Feedback error={error} loading={!data && !error} />
        {booking && <>
            <DetailsGrid entries={[["Parking",booking.parking_title],["Address",booking.address],
                ["Customer",booking.seeker_name],["Customer email",booking.seeker_email],["Owner",booking.owner_name],
                ["Vehicle",booking.vehicle_number],["Time",`${booking.date} · ${booking.start_time.slice(0,5)}–${booking.end_time.slice(0,5)}`],
                ["Status",booking.status],["Total",formatMoney(booking.amount)],["Entry",displayTime(booking.checkin_time)],
                ["Exit",displayTime(booking.checkout_time)]]} />
            <h3>Payments</h3><AdminTable columns={paymentColumns} rows={data.payments} empty="No payment records." />
        </>}
    </AdminDialog>;
}

const paymentColumns = [
    ["Payment", row => <><strong>#{row.id}</strong><small>Booking #{row.booking_id}</small></>],
    ["Amount", row => formatMoney(row.amount)],["Status", row => <StatusTag>{row.status}</StatusTag>],
    ["Razorpay", row => <><small>{row.razorpay_order_id || "No order ID"}</small><small>{row.razorpay_payment_id || "No payment ID"}</small></>],
    ["Refund", row => <><StatusTag>{row.refund_status}</StatusTag>{row.razorpay_refund_id && <small>{row.razorpay_refund_id}</small>}</>],
    ["Attempts", row => row.attempts?.length ? <details><summary>{row.attempts.length} recorded</summary>
        <ul>{row.attempts.map(attempt => <li key={attempt.provider_payment_id}>{attempt.status} · {attempt.provider_payment_id}</li>)}</ul></details> : "—"]
];

export function AdminPayments() {
    const { data, error } = useAdminData("/admin/payments");
    const [filter, setFilter] = useState("all");
    const rows = data?.payments.filter(payment => filter === "all" || filter === "refunds" && payment.refund_status !== "NOT_REQUESTED" ||
        filter === "FAILED" && payment.attempts?.some(attempt => attempt.status === "FAILED") || payment.status === filter);
    return <section className="admin-panel"><h2>Payment and refund monitoring</h2>
        <div className="admin-filters"><label>Payment status<select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All payment records</option><option value="SUCCESS">Successful payments</option>
            <option value="FAILED">Failed payments and attempts</option><option value="PENDING">Pending payments</option>
            <option value="refunds">Refund records</option></select></label></div>
        <Feedback error={error} loading={!data && !error} />
        {rows && <AdminTable rows={rows} columns={paymentColumns} />}
    </section>;
}

export function AdminListingReports() {
    const { data, error, reload } = useAdminData("/admin/listing-reports");
    const action = useAdminAction(reload);
    const [onlyOpen, setOnlyOpen] = useState(true);
    const [notes, setNotes] = useState({});
    const rows = data?.reports.filter(row => !onlyOpen || row.status === "OPEN");
    return <section className="admin-panel"><h2>Reported listings</h2>
        <label className="admin-checkbox"><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} /> Open reports only</label>
        <Feedback error={error || action.error} message={action.message} loading={!data && !error} />
        {rows?.length === 0 && <p className="admin-empty">No listing reports in this view.</p>}
        {rows?.map(report => <article key={report.id} className="admin-report">
            <div className="owner-heading"><h3>{report.parking_title} · #{report.id}</h3><StatusTag>{report.status}</StatusTag></div>
            <p>{report.address}</p><p>{report.reason}</p><small>Reported by {report.reporter_name} · {displayTime(report.created_at)}</small>
            <details><summary>Listing photos</summary><ListingPhotos listing={report} /></details>
            {report.status === "OPEN" ? <div className="admin-form">
                <label>Review note<textarea maxLength={1000} value={notes[report.id] || ""} onChange={e => setNotes({ ...notes, [report.id]: e.target.value })} /></label>
                <div className="admin-actions">{[["RESOLVED","Resolve report"],["DISMISSED","Dismiss report"]].map(([status,label]) =>
                    <button key={status} type="button" disabled={action.busy} onClick={() =>
                        action.patch(`/admin/listing-reports/${report.id}/review`, { status, note: notes[report.id] || "" })}>{label}</button>)}</div>
            </div> : <p>Reviewed by {report.reviewer_name || "Admin"} · {displayTime(report.reviewed_at)}{report.review_note && ` · ${report.review_note}`}</p>}
        </article>)}
    </section>;
}

