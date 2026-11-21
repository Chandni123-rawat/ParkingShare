import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import OwnerSlots from "../components/OwnerSlots";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const blank = { days_of_week: [], start_time: "09:00", end_time: "18:00", valid_from: "", valid_until: "" };

export default function ParkingAvailability() {
    const { id } = useParams();
    const [parking, setParking] = useState(null);
    const [rules, setRules] = useState([]);
    const [form, setForm] = useState(blank);
    const [editing, setEditing] = useState(null);
    const [revision, setRevision] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const base = `/parking/${id}/availability`;

    useEffect(() => {
        Promise.all([api.get("/parking/owner/my-parkings"), api.get(base)]).then(([listings, result]) => {
            const own = listings.data.parkings.find(parking => String(parking.id) === id);
            if (!own) throw new Error("Parking listing not found.");
            setParking(own);
            setRules(result.data.availability);
        }).catch(error => setError(error.response?.data?.message || error.message));
    }, [base, id]);

    function update(field, value) {
        setForm(current => ({ ...current, [field]: value }));
    }

    function reset() {
        setEditing(null);
        setForm(blank);
    }

    async function mutate(action, success) {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            await action();
            reset();
            setMessage(success);
            setRevision(previous => previous + 1);
            const { data } = await api.get(base);
            setRules(data.availability);
        } catch (error) {
            setError(error.response?.data?.message || "Unable to update this rule.");
        } finally {
            setBusy(false);
        }
    }

    return <>
        <header className="owner-heading"><div><h1>Parking availability</h1><p>{parking?.title}</p></div>
            <Link to="/my-parkings" className="owner-secondary">Back to listings</Link></header>
        {!parking && (error ? <p className="notice error" role="alert">{error}</p> : <p role="status">Loading availability…</p>)}
        {parking && <>
            <OwnerSlots id={id} revision={revision} />
            <section className="owner-panel">
                <h2>Recurring availability</h2>
                <p>Repeat a time slot on selected weekdays. Each rule schedules up to 31 days.</p>
                <form className="owner-form" onSubmit={event => {
                    event.preventDefault();
                    const fields = Object.fromEntries(new FormData(event.currentTarget));
                    const payload = { ...fields, days_of_week: form.days_of_week };
                    mutate(() => editing ? api.patch(`${base}/${editing}`, payload) : api.post(base, payload),
                        editing ? "Recurring rule updated." : "Recurring rule added.");
                }}>
                    <fieldset><legend>Weekdays</legend><div className="owner-actions">{weekdays.map((day, index) =>
                        <label key={day} className="owner-check"><input type="checkbox" checked={form.days_of_week.includes(index)}
                            onChange={e => update("days_of_week", e.target.checked ? [...form.days_of_week, index] : form.days_of_week.filter(value => value !== index))} />{day.slice(0, 3)}</label>
                    )}</div></fieldset>
                    <div className="owner-field-row">{[["valid_from", "Start date", "date"], ["valid_until", "End date (optional)", "date"],
                        ["start_time", "Recurring start time", "time"], ["end_time", "Recurring end time", "time"]].map(([key, title, type]) =>
                        <label key={key}>{title}<input name={key} type={type} required={key !== "valid_until"} value={form[key]} onChange={e => update(key, e.target.value)} /></label>
                    )}</div>
                    <div className="owner-actions"><button className="primary" disabled={busy || !form.days_of_week.length}>{editing ? "Save rule" : "Add recurring rule"}</button>
                        {editing && <button type="button" onClick={reset}>Cancel edit</button>}</div>
                </form>
                {error && <p className="notice error" role="alert">{error}</p>}
                {message && <p className="notice success" role="status">{message}</p>}
                <div className="owner-table">{rules.length > 0 && <table><thead><tr><th>Weekdays</th><th>Time</th><th>Dates</th><th>Actions</th></tr></thead>
                    <tbody>{rules.map(rule => <tr key={rule.id}><td>{rule.days_of_week.map(day => weekdays[day].slice(0, 3)).join(", ")}</td>
                        <td>{rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}</td><td>{rule.valid_from} – {rule.valid_until || "31 days"}</td>
                        <td><div className="owner-actions"><button type="button" disabled={busy} onClick={() => {
                            setEditing(rule.id);
                            setForm({ ...rule, start_time: rule.start_time.slice(0, 5), end_time: rule.end_time.slice(0, 5), valid_until: rule.valid_until || "" });
                        }}>Edit rule</button><button type="button" className="owner-danger" disabled={busy} onClick={() => {
                            if (window.confirm("Delete this recurring rule?")) mutate(() => api.delete(`${base}/${rule.id}`), "Recurring rule deleted.");
                        }}>Delete rule</button></div></td></tr>)}</tbody></table>}</div>
            </section>
        </>}
    </>;
}
