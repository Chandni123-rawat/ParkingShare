import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { parkingImageUrl } from "../services/parkingImages";

export function AdminTable({ columns, rows, empty = "No records match these filters." }) {
    if (!rows.length) return <p className="admin-empty">{empty}</p>;
    return <div className="admin-table" tabIndex={0}><table><thead><tr>
        {columns.map(([title]) => <th scope="col" key={title}>{title}</th>)}
    </tr></thead><tbody>{rows.map(row => <tr key={row.id}>
        {columns.map(([title, content]) => <td key={title}>{content(row)}</td>)}
    </tr>)}</tbody></table></div>;
}

export function AdminDialog({ title, onClose, children }) {
    const dialog = useRef(null);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => { if (element.open) element.close(); };
    }, []);
    return <dialog className="admin-dialog" ref={dialog} aria-label={title} onCancel={onClose}>
        <header><h2>{title}</h2><button type="button" aria-label="Close details" className="owner-secondary" onClick={onClose}><X size={18} /></button></header>
        {children}
    </dialog>;
}

export const matches = (query, ...values) => values.some(value => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase()));

export function StatusTag({ children }) {
    return <span className="owner-status">{String(children || "Unavailable").replaceAll("_", " ")}</span>;
}

export function ListingPhotos({ listing }) {
    return listing.photos?.length ? <div className="admin-photos">{listing.photos.map((photo, index) =>
        <img src={parkingImageUrl(photo)} alt={`Parking photo ${index + 1}`} key={photo} />
    )}</div> : <p>No listing photos.</p>;
}

export function DetailsGrid({ entries }) {
    return <dl className="booking-fields">{entries.map(([title, value]) =>
        <div key={title}><dt>{title}</dt><dd>{value ?? "—"}</dd></div>
    )}</dl>;
}

export const displayTime = value => value ? new Date(value).toLocaleString() : "—";
