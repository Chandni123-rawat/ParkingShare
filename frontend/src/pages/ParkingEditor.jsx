import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import DestinationSearch from "../components/DestinationSearch";
import api from "../services/api";
import { useGoogleMaps } from "../services/googleMaps";
import { parkingImageUrl } from "../services/parkingImages";
import "./discovery.css";

const blank = { title: "", description: "", address: "", latitude: "", longitude: "", price_per_hour: "", capacity: 1,
    vehicle_types: ["car", "bike"], is_available: true, photos: [] };

function SelectPoint({ onSelect, point }) {
    const map = useMap();
    useEffect(() => {
        if (point && !map.getBounds().contains(point)) map.panTo(point);
    }, [map, point]);
    useMapEvents({ click: event => onSelect(event.latlng.lat, event.latlng.lng) });
    return point ? <CircleMarker center={point} radius={10} pathOptions={{ color: "#0b5c44", fillOpacity: 0.9 }} /> : null;
}

export default function ParkingEditor() {
    const { id } = useParams();
    return <ParkingForm key={id || "new"} id={id} />;
}

function ParkingForm({ id }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const [parking, setParking] = useState(id ? null : blank);
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(state?.uploadError || "");
    const [message, setMessage] = useState("");
    const maps = useGoogleMaps();

    useEffect(() => {
        if (!id) return;
        api.get("/parking/owner/my-parkings").then(({ data }) => {
            const own = data.parkings.find(item => String(item.id) === id);
            if (!own) throw new Error("Parking listing not found.");
            setParking({ ...blank, ...own, description: own.description || "", photos: own.photos || [],
                latitude: own.latitude ?? "", longitude: own.longitude ?? "" });
        }).catch(error => setError(error.response?.data?.message || error.message));
    }, [id]);

    function field(name, value) {
        setParking(current => ({ ...current, [name]: value }));
    }

    function pickLocation(lat, lng, address) {
        setParking(current => ({ ...current, address: address || current.address,
            latitude: lat.toFixed(7), longitude: lng.toFixed(7) }));
    }

    function chooseImages(event) {
        const selected = [...event.target.files];
        if (parking.photos.length + selected.length > 5 || selected.some(file => file.size > 5 * 1024 * 1024)) {
            setError("Choose up to five images total, each 5 MB or smaller.");
            event.target.value = "";
            setFiles([]);
            return;
        }
        setError("");
        setFiles(selected);
    }

    async function save(event) {
        event.preventDefault();
        setError("");
        setMessage("");
        if (!point) {
            setError("Select an address from the search results or click the map to set the parking location.");
            return;
        }
        setBusy(true);
        let savedId = id;
        try {
            const { title, description, address, latitude, longitude, price_per_hour, capacity, vehicle_types, is_available } = parking;
            const payload = { title, description, address, latitude, longitude, price_per_hour, capacity, vehicle_types, is_available };
            const { data } = id ? await api.patch(`/parking/${id}`, payload) : await api.post("/parking", payload);
            savedId = data.parking.id;
            if (files.length) {
                const form = new FormData();
                files.forEach(file => form.append("images", file));
                await api.post(`/parking/${savedId}/images`, form);
            }
            navigate("/my-parkings", { state: { message: data.message } });
        } catch (error) {
            const detail = error.response?.data?.message || "Unable to save the parking space.";
            if (!id && savedId) {
                navigate(`/my-parkings/${savedId}/edit`, { replace: true, state: { uploadError: `Listing saved. Reselect your images and try again. ${detail}` } });
            } else {
                setError(detail);
            }
        } finally {
            setBusy(false);
        }
    }

    async function removeImage(imageUrl) {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            const { data } = await api.delete(`/parking/${id}/images`, { data: { imageUrl } });
            field("photos", data.parking.photos);
            setMessage(data.message);
        } catch (error) {
            setError(error.response?.data?.message || "Unable to remove this image.");
        } finally {
            setBusy(false);
        }
    }

    const coordinates = parking && [parking.latitude, parking.longitude].map(Number);
    const point = parking && parking.latitude !== "" && parking.longitude !== "" &&
        Math.abs(coordinates[0]) <= 90 && Math.abs(coordinates[1]) <= 180 ? coordinates : null;

    return <>
        <header className="owner-heading"><div><h1>{id ? "Edit parking" : "Add parking"}</h1><p>Set where drivers park, what you charge and which vehicles you accept.</p></div>
            <Link className="owner-secondary" to="/my-parkings">Back to listings</Link></header>
        {error && <p className="notice error" role="alert">{error}</p>}
        {message && <p className="notice success" role="status">{message}</p>}
        {!parking && !error && <p role="status">Loading parking details…</p>}
        {parking && <form className="owner-form" onSubmit={save}>
            <section className="owner-panel">
                <h2>Listing details</h2>
                <label>Parking name<input required maxLength={150} value={parking.title} onChange={e => field("title", e.target.value)} /></label>
                <label>Description<textarea maxLength={4000} value={parking.description} onChange={e => field("description", e.target.value)} /></label>
                <div className="owner-field-row">
                    <label>Hourly price (₹)<input required type="number" min="0.01" max="999999.99" step="0.01" value={parking.price_per_hour} onChange={e => field("price_per_hour", e.target.value)} /></label>
                    <label>Total capacity<input required type="number" min="1" max="500" value={parking.capacity} onChange={e => field("capacity", e.target.value)} /></label>
                </div>
                <fieldset><legend>Supported vehicle types</legend><div className="owner-actions">
                    {["car", "bike"].map(type => <label className="owner-check" key={type}><input type="checkbox" checked={parking.vehicle_types.includes(type)}
                        onChange={e => field("vehicle_types", e.target.checked ? [...parking.vehicle_types, type] : parking.vehicle_types.filter(value => value !== type))} />{type === "car" ? "Car" : "Bike"}</label>)}
                </div></fieldset>
                <label className="owner-check"><input type="checkbox" disabled={Boolean(parking.admin_deactivated_at)} checked={parking.is_available} onChange={e => field("is_available", e.target.checked)} /> {parking.admin_deactivated_at ? "Listing deactivated by admin" : "Listing enabled"}</label>
            </section>
            <section className="owner-panel">
                <h2>Parking location</h2>
                <p>Search for your address and select a result. Click the map to adjust the pin.</p>
                <DestinationSearch maps={maps} label="Search parking address"
                    destination={point ? { lat: point[0], lng: point[1] } : null}
                    onSelect={({ lat, lng, address, label }) => pickLocation(lat, lng, address || label)} />
                <label>Full address<input required maxLength={1000} value={parking.address} onChange={e => field("address", e.target.value)} /></label>
                <MapContainer className="owner-map" center={point || [27.605, 77.595]} zoom={13} scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                    <SelectPoint point={point} onSelect={pickLocation} />
                </MapContainer>
            </section>
            <section className="owner-panel">
                <h2>Parking images</h2>
                {parking.photos.length > 0 && <div className="owner-photo-grid">
                    {parking.photos.map((url, index) => <div key={url}><img src={parkingImageUrl(url)} alt={`Parking image ${index + 1}`} />
                        <button type="button" onClick={() => removeImage(url)} disabled={busy}>Remove image {index + 1}</button></div>)}
                </div>}
                <label>Add images<input multiple type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImages} /></label>
                <p>Up to five images per listing, 5 MB each.</p>
            </section>
            <div className="owner-actions"><button className="primary" disabled={busy || !parking.vehicle_types.length}>{busy ? "Saving…" : id ? "Save changes" : "Create listing"}</button>
                {!parking.vehicle_types.length && <span role="status">Select at least one vehicle type.</span>}</div>
        </form>}
    </>;
}
