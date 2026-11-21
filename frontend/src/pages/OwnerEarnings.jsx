import { useEffect, useState } from "react";
import api from "../services/api";
import { formatMoney } from "../services/discovery";

export default function OwnerEarnings() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        api.get("/owner/earnings", { signal: controller.signal })
            .then(({ data }) => setData(data.earnings))
            .catch(error => {
                if (!controller.signal.aborted) setError(error.response?.data?.message || "Unable to load earnings.");
            });
        return () => controller.abort();
    }, []);
    return <>
        <header className="owner-heading"><h1>Earnings</h1></header>
        {error && <p className="notice error" role="alert">{error}</p>}
        {!data && !error && <p role="status">Loading earnings…</p>}
        {data && <div className="owner-metrics">
            {[["Gross bookings",formatMoney(data.gross)],["Platform fees",formatMoney(data.fees)],
                ["Net earnings",formatMoney(data.net)],["Completed bookings",data.completed_bookings]].map(([label,value]) =>
                <article className="owner-panel owner-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}
        </div>}
    </>;
}