import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleParking, MapPin, Plus } from "lucide-react";
import api from "../services/api";
import { parkingImageUrl } from "../services/parkingImages";

export default function MyParkings() {
    const [listings, setListings] = useState(null);
    const [error, setError] = useState("");
    const { state } = useLocation();
    const [message, setMessage] = useState(state?.message || "");
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        api.get("/parking/owner/my-parkings")
            .then(({ data }) => setListings(data.parkings))
            .catch(error => setError(error.response?.data?.message || "Unable to load your parking spaces."));
    }, []);

    async function changeListing(parking, remove = false) {
        if (remove && !window.confirm(`Remove ${parking.title} from your listings? Existing bookings will be retained.`)) return;
        setError("");
        setMessage("");
        setBusy(parking.id);
        try {
            const endpoint = `/parking/${parking.id}`;
            const { data } = remove ? await api.delete(endpoint)
                : await api.patch(endpoint, { is_available: !parking.is_available });
            setListings(items => remove ? items.filter(item => item.id !== parking.id)
                : items.map(item => item.id === parking.id ? { ...item, ...data.parking } : item));
            setMessage(data.message);
        } catch (error) {
            setError(error.response?.data?.message || "Unable to update this listing.");
        } finally {
            setBusy(null);
        }
    }

    return <>
        <header className="owner-heading">
            <div><h1>My parking spaces</h1><p>Manage listings, parking details and availability.</p></div>
            <Link className="primary" to="/my-parkings/new"><Plus size={18} /> Add parking</Link>
        </header>
        {error && <p role="alert" className="notice error">{error}</p>}
        {message && <p role="status" className="notice success">{message}</p>}
        {!listings && !error && <p role="status">Loading parking spaces…</p>}
        {listings?.length === 0 && <div className="owner-panel"><p>You haven’t listed any parking spaces yet.</p><Link to="/my-parkings/new">Add your first parking space</Link></div>}
        <div className="owner-listing-grid">
            {listings?.map(parking => <article className="owner-panel listing-card" key={parking.id}>
                <div className="listing-cover">
                    {parking.photos?.[0] ? <img alt={parking.title} src={parkingImageUrl(parking.photos[0])} /> : <CircleParking size={44} aria-hidden="true" />}
                </div>
                <div className="listing-body">
                    <div className="owner-actions"><span className="owner-status">{parking.approval_status}</span><span className="owner-status">{parking.admin_deactivated_at ? "Admin deactivated" : parking.is_available ? "Enabled" : "Paused"}</span></div>
                    <h2>{parking.title}</h2>
                    <p className="listing-address"><MapPin size={17} />{parking.address}</p>
                    <p><strong>₹{parking.price_per_hour}/hr</strong> · {parking.capacity} {parking.capacity === 1 ? "space" : "spaces"} · {parking.vehicle_types.join(", ")}</p>
                    {parking.rejection_reason && <p className="notice error">{parking.rejection_reason}</p>}
                    <div className="owner-actions">
                        <Link className="owner-secondary" to={`/my-parkings/${parking.id}/edit`}>Edit parking</Link>
                        <Link className="owner-secondary" to={`/parking/${parking.id}/availability`}>Availability</Link>
                        {!parking.admin_deactivated_at && <button type="button" onClick={() => changeListing(parking)} disabled={busy === parking.id}>{parking.is_available ? "Deactivate" : "Activate"}</button>}
                        <button type="button" className="owner-danger" onClick={() => changeListing(parking, true)} disabled={busy === parking.id}>Delete</button>
                    </div>
                </div>
            </article>)}
        </div>
    </>;
}
