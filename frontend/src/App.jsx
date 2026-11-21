import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import BookingReceipt from "./pages/BookingReceipt";
import CreateBooking from "./pages/CreateBooking";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyBookings from "./pages/MyBookings";
import MyParkings from "./pages/MyParkings";
import MyVehicles from "./pages/MyVehicles";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import OwnerBookings from "./pages/OwnerBookings";
import OwnerLayout from "./components/OwnerLayout";
import OwnerEarnings from "./pages/OwnerEarnings";
import ParkingCompare from "./pages/ParkingCompare";
import ParkingDetails from "./pages/ParkingDetails";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { NotificationProvider } from "./services/notificationFeed";
import { SessionProvider } from "./services/session";
import "./parkshare.css";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const Payment = lazy(() => import("./pages/Payment"));
const ParkingEditor = lazy(() => import("./pages/ParkingEditor"));
const ParkingAvailability = lazy(() => import("./pages/ParkingAvailability"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const ownerRoles = ["owner", "both"];

export default function App() {
    return (
        <BrowserRouter>
            <SessionProvider>
                <NotificationProvider>
                <a className="skip-link" href="#main-content">Skip to content</a>
                <Navbar />
                <div className="site-content" id="main-content" tabIndex={-1}>
                    <Suspense fallback={<p className="route-status" role="status">Loading page…</p>}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/seeker" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                        <Route path="/compare" element={<ParkingCompare />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/parking/:id" element={<ParkingDetails />} />
                        <Route path="/booking/create/:id" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
                        <Route path="/booking/:id/receipt" element={<ProtectedRoute><BookingReceipt /></ProtectedRoute>} />
                        <Route path="/booking/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
                        <Route path="/payment/:id" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                        <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
                        <Route path="/my-vehicles" element={<ProtectedRoute><MyVehicles /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                        <Route element={<RoleRoute allowedRoles={ownerRoles}><OwnerLayout /></RoleRoute>}>
                            <Route path="/owner/bookings" element={<OwnerBookings key="incoming" />} />
                            <Route path="/owner/history" element={<OwnerBookings key="history" history />} />
                            <Route path="/owner/earnings" element={<OwnerEarnings />} />
                            <Route path="/my-parkings" element={<MyParkings />} />
                            <Route path="/my-parkings/new" element={<ParkingEditor />} />
                            <Route path="/my-parkings/:id/edit" element={<ParkingEditor />} />
                            <Route path="/parking/:id/availability" element={<ParkingAvailability />} />
                            <Route path="/owner/dashboard" element={<Suspense fallback={<p role="status">Loading dashboard…</p>}><OwnerDashboard /></Suspense>} />
                        </Route>
                        <Route path="/admin" element={<RoleRoute allowedRoles={["admin"]}><AdminDashboard /></RoleRoute>} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                </div>
                </NotificationProvider>
            </SessionProvider>
        </BrowserRouter>
    );
}
