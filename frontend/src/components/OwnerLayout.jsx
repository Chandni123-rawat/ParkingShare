import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, ChartNoAxesCombined, CircleParking, History, Wallet } from "lucide-react";
import "./owner.css";

const links = [
    ["/owner/dashboard", "Overview", ChartNoAxesCombined],
    ["/my-parkings", "My parking spaces", CircleParking],
    ["/owner/bookings", "Owner bookings", CalendarDays],
    ["/owner/history", "Booking history", History],
    ["/owner/earnings", "Earnings", Wallet],
];

export default function OwnerLayout() {
    return <div className="owner-layout">
        <aside className="owner-sidebar">
            <nav aria-label="Owner workspace">
                {links.map(([path, title, Icon]) => <NavLink key={path} to={path}><Icon size={18} aria-hidden="true" />{title}</NavLink>)}
            </nav>
        </aside>
        <main className="owner-main"><Outlet /></main>
    </div>;
}
