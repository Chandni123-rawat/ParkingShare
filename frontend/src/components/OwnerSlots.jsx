import { useEffect, useState } from "react";
import api from "../services/api";

const blank = { date: "", start_time: "09:00", end_time: "10:00" };
const shortTime = value => value.slice(0, 5);

export default function OwnerSlots({ id, revision }) {
    const [slots, setSlots] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [form, setForm] = useState(blank);
    const [mode, setMode] = useState("open");
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function load() {
        const [scheduled, reserved] = await Promise.all([
            api.get(`/parking/${id}/slots`), api.get(`/parking/${id}/reservations`)
        ]);
        setSlots(scheduled.data.slots);
        setReservations(reserved.data.reservations);
    }

    useEffect(() => {
        load().catch(error => setError(error.response?.data?.message || "Unable to load availability."));
    }, [id, revision]);

    function reset() {
        setEditing(null);
        setMode("open");
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
            await load();
        } catch (error) {
            setError(error.response?.data?.message || "Unable to update availability.");
        } finally {
            setBusy(false);
        }
    }

    function submit(event) {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const payload = Object.fromEntries(fields);
        const base = `/parking/${id}`;
        mutate(() => editing ? api.patch(`${base}/slots/${editing.id}`, payload)
            : api.post(`${base}/${mode === "open" ? "slots" : "block"}`, payload),
        editing ? "Availability updated." : "Availability saved.");
    }

    function edit(slot) {
        setEditing(slot);
        setMode(slot.end_time.startsWith("24:") && slot.status === "blocked" ? "day" : slot.status);
        setForm({ date: slot.date, start_time: shortTime(slot.start_time), end_time: shortTime(slot.end_time) });
    }

    return <>
        <section className="owner-panel">
            <h2>{editing ? "Edit time slot" : "Schedule an individual date"}</h2>
            <form className="owner-form" onSubmit={submit}>
                {!editing && <label>Schedule type<select value={mode} onChange={event => setMode(event.target.value)}>
                    <option value="open">Available time slot</option><option value="day">Block entire date</option><option value="blocked">Block a time range</option>
                </select></label>}
                <div className="owner-field-row">
                    <label>Date<input name="date" type="date" value={form.date} required onChange={event => setForm({ ...form, date: event.target.value })} /></label>
                    {mode !== "day" && <>
                        <label>Start time<input name="start_time" type="time" value={form.start_time} required onChange={event => setForm({ ...form, start_time: event.target.value })} /></label>
                        <label>End time<input name="end_time" type="time" value={form.end_time} required onChange={event => setForm({ ...form, end_time: event.target.value })} /></label>
                    </>}
                </div>
                <div className="owner-actions"><button className="primary" disabled={busy}>{editing ? "Save slot" : mode === "open" ? "Add slot" : "Block availability"}</button>
                    {editing && <button type="button" onClick={reset}>Cancel edit</button>}</div>
            </form>
            {error && <p className="notice error" role="alert">{error}</p>}
            {message && <p className="notice success" role="status">{message}</p>}
        </section>
        <section className="owner-panel"><h2>Scheduled slots</h2>
            {!slots && !error && <p role="status">Loading schedule…</p>}
            {slots?.length === 0 && <p>No slots are scheduled.</p>}
            {slots?.length > 0 && <div className="owner-table"><table><thead><tr>
                <th>Date</th><th>Time</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody>{slots.map(slot => <tr key={slot.id}>
                <td>{slot.date}</td><td>{shortTime(slot.start_time)}–{shortTime(slot.end_time)}</td>
                <td>{slot.status === "open" ? "Available" : "Blocked"} · {slot.source}</td>
                <td><div className="owner-actions"><button type="button" onClick={() => edit(slot)} disabled={busy}>Edit</button>
                    <button type="button" className="owner-danger" disabled={busy} onClick={() => {
                        if (window.confirm("Delete this slot?")) mutate(() => api.delete(`/parking/${id}/slots/${slot.id}`), "Slot deleted.");
                    }}>Delete slot</button></div></td>
            </tr>)}</tbody></table></div>}
        </section>
        <section className="owner-panel"><h2>Existing reservations</h2>
            {slots && reservations.length === 0 && <p>No open reservations for this listing.</p>}
            {reservations.length > 0 && <div className="owner-table"><table><thead><tr><th>Customer</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>{reservations.map(item => <tr key={item.id}><td>{item.seeker_name}</td><td>{item.date}</td><td>{shortTime(item.start_time)}–{shortTime(item.end_time)}</td><td>{item.status.replaceAll("_", " ")}</td></tr>)}</tbody>
            </table></div>}
        </section>
    </>;
}
