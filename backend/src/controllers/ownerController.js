const db = require("../config/db");
const { bookingHandler } = require("../services/bookingTransaction");

const getOwnerEarnings = bookingHandler(async (req, res) => {
    const { rows: [earnings] } = await db.query(
        `SELECT COUNT(*)::int AS completed_bookings, COALESCE(SUM(gross_amount),0) AS gross,
                COALESCE(SUM(platform_fee),0) AS fees, COALESCE(SUM(owner_earning),0) AS net
         FROM wallet_settlements WHERE owner_id = $1`, [req.user.userId]
    );
    res.json({ earnings });
});

module.exports = { getOwnerEarnings };