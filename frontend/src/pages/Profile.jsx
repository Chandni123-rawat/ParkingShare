
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useSession } from "../services/session";

function Profile() {
    const navigate = useNavigate();
    const { clear, updateUser } = useSession();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        bio: "",
    });

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Change password states
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get("/users/me");

                setUser(response.data.user);

                setFormData({
                    name: response.data.user.name || "",
                    phone: response.data.user.phone || "",
                    bio: response.data.user.bio || "",
                });
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Unable to load profile."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const response = await api.patch("/users/me", formData);
            const updatedUser = { ...user, ...response.data.user };
            setUser(updatedUser);
            updateUser(updatedUser);

            setMessage("Profile updated successfully.");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to update profile."
            );
        } finally {
            setSaving(false);
        }
    };

    // Change password handler
    const handleChangePassword = async (e) => {
        e.preventDefault();

        setPasswordError("");
        setPasswordMessage("");

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }

        if (passwordData.newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            return;
        }

        setPasswordLoading(true);

        try {
            const response = await api.post("/auth/change-password", {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                confirmPassword: passwordData.confirmPassword,
            });

            setPasswordMessage(response.data.message);

            clear();

            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            // Redirect to login
            navigate("/login", {
                replace: true,
                state: { message: response.data.message },
            });

        } catch (error) {
            setPasswordError(
                error.response?.data?.message ||
                "Unable to change password."
            );
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) return <h2>Loading profile...</h2>;
    if (!user) return <p className="notice error" role="alert">{error || "Profile not found."}</p>;

    return (
        <main className="profile-page">
            <h1>My profile</h1>

            {/* Edit Profile */}
            <form className="account-card" onSubmit={handleSave}>
                <h2>Personal information</h2>
                <div>
                    <label htmlFor="profile-name">Name</label>
                    <input
                        type="text" id="profile-name" required minLength={2} maxLength={100}
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="profile-phone">Phone</label>
                    <input
                        type="tel" id="profile-phone" required
                        value={formData.phone}
                        onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                        }
                    />
                </div>

                <br />

                <label htmlFor="profile-bio">Bio</label>
                <textarea id="profile-bio" value={formData.bio} maxLength={500}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                <p><strong>Role:</strong> {{ seeker: "Parking Seeker", owner: "Parking Owner", admin: "Admin", both: "Seeker and Owner" }[user.role]}</p>

                <br />

                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Verification:</strong> {user.verification_status}</p>


                {error && <p className="notice error" role="alert">{error}</p>}
                {message && <p className="notice success" role="status">{message}</p>}

                <button className="primary" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </form>




            
{/* Change Password */}
            <form className="account-card" onSubmit={handleChangePassword}>
                <h2>Change password</h2>
                <div>
                    <label htmlFor="profile-password-0">Current Password</label>
                    <input
                        id="profile-password-0" type="password" autoComplete="current-password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                            setPasswordData({
                                ...passwordData,
                                currentPassword: e.target.value,
                            })
                        }
                        placeholder="Enter current password"
                        required
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="profile-password-1">New Password</label>
                    <input
                        id="profile-password-1" type="password" autoComplete="new-password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                            setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value,
                            })
                        }
                        placeholder="Enter new password"
                        required
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="profile-password-2">Confirm New Password</label>
                    <input
                        id="profile-password-2" type="password" autoComplete="new-password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                            setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value,
                            })
                        }
                        placeholder="Confirm new password"
                        required
                    />
                </div>

                <br />

                {passwordError && <p className="notice error" role="alert">{passwordError}</p>}
                {passwordMessage && <p className="notice success" role="status">{passwordMessage}</p>}

                <button className="primary" type="submit" disabled={passwordLoading}>
                    {passwordLoading
                        ? "Changing Password..."
                        : "Change Password"}
                </button>
            </form>
        </main>
    );
}

export default Profile;
