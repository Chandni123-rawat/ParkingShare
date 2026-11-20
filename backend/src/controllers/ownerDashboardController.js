const db = require("../config/db");

async function getOwnerDashboard(req, res) {
    const owner = req.user.userId;
    const { rows: [dashboard] } = await db.query(
        `WITH owned AS (
            SELECT p.id, p.is_available, p.approval_status, p.archived_at, p.admin_deactivated_at, u.account_status
            FROM parking_spaces p JOIN users u ON u.id = p.owner_id WHERE p.owner_id = $1
         ), bookings_owned AS (
            SELECT b.status, b.date FROM bookings b JOIN owned p ON p.id = b.parking_space_id
         ), settlements AS (
            SELECT owner_earning, created_at FROM wallet_settlements WHERE owner_id = $1
         ), by_status AS (
            SELECT status, COUNT(*)::int AS count FROM bookings_owned GROUP BY status
         ), booking_months AS (
            SELECT date_trunc('month', date)::date AS month, COUNT(*)::int AS bookings
            FROM bookings_owned WHERE date >= date_trunc('month', CURRENT_DATE) - interval '5 months' GROUP BY 1
         ), earning_months AS (
            SELECT date_trunc('month', created_at)::date AS month, SUM(owner_earning) AS earnings
            FROM settlements WHERE created_at >= date_trunc('month', CURRENT_DATE) - interval '5 months' GROUP BY 1
         ), months AS (
            SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months',
                                   date_trunc('month', CURRENT_DATE), interval '1 month')::date AS month
         )
         SELECT (SELECT COUNT(*)::int FROM owned WHERE archived_at IS NULL) AS total_spaces,
                (SELECT COUNT(*)::int FROM owned WHERE archived_at IS NULL AND is_available AND approval_status = 'APPROVED' AND admin_deactivated_at IS NULL AND account_status = 'ACTIVE') AS active_listings,
                (SELECT COUNT(*)::int FROM bookings_owned) AS total_bookings,
                (SELECT COUNT(*)::int FROM bookings_owned WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLATION_PENDING')) AS pending_bookings,
                (SELECT COUNT(*)::int FROM bookings_owned WHERE status = 'COMPLETED') AS completed_bookings,
                (SELECT COUNT(*)::int FROM bookings_owned WHERE status = 'CANCELLED') AS cancelled_bookings,
                (SELECT COALESCE(SUM(owner_earning), 0) FROM settlements) AS total_earnings,
                COALESCE((SELECT json_agg(by_status ORDER BY status) FROM by_status), '[]') AS status_distribution,
                (SELECT json_agg(json_build_object('month', to_char(m.month, 'YYYY-MM'),
                    'bookings', COALESCE(b.bookings, 0), 'earnings', COALESCE(e.earnings, 0)) ORDER BY m.month)
                 FROM months m LEFT JOIN booking_months b USING (month) LEFT JOIN earning_months e USING (month)) AS monthly`, [owner]
    );
    res.json({ dashboard });
}

module.exports = { getOwnerDashboard };
