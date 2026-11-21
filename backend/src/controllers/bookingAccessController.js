const db = require("../config/db");
const { positiveId } = require("../services/parkingValidation");
const { parkingTimeZone, otpFor, qrFor, readQr, validOtp } = require("../services/bookingPass");
const { transaction, bookingHandler, bookingError } = require("../services/bookingTransaction");
const { notifyBooking } = require("../services/notificationService");
const { reserveRefund, submitReservedRefund } = require("../services/refundService");

const passDetails = bookingHandler(async (req, res) => {
    if (!positiveId(req.params.id)) throw bookingError(400, "Invalid booking ID.");
    const { rows: [booking] } = await db.query(
        `SELECT b.id, b.pass_nonce, b.date::text AS date, b.start_time, b.end_time, b.status,
                ps.title AS parking_title, u.name AS customer_name,
                COALESCE(b.vehicle_number_snapshot, v.vehicle_number) AS vehicle_number
         FROM bookings b JOIN parking_spaces ps ON ps.id = b.parking_space_id
         JOIN users u ON u.id = b.seeker_id LEFT JOIN vehicles v ON v.id = b.vehicle_id
         WHERE b.id = $1 AND b.seeker_id = $2`, [req.params.id, req.user.userId]
    );
    if (!booking) throw bookingError(404, "Booking not found.");
    if (!booking.pass_nonce || !["CONFIRMED", "ACTIVE"].includes(booking.status)) {
        throw bookingError(409, "A parking pass is available after verified payment and until checkout.");
    }
    const { pass_nonce, ...details } = booking;
    res.set("Cache-Control", "no-store").json({ pass: { ...details, otp: otpFor(booking), qr: qrFor(booking) } });
});

const bookingReceipt = bookingHandler(async (req, res) => {
    if (!positiveId(req.params.id)) throw bookingError(400, "Invalid booking ID.");
    const { rows: [receipt] } = await db.query(
        `SELECT b.id AS booking_id, concat('PS-', b.id, '-', p.id) AS receipt_number,
         ps.title AS parking_title, ps.address, u.name AS customer_name, b.date::text AS date, b.start_time, b.end_time,
         p.amount, p.currency, p.status AS payment_status, p.refund_status, p.refund_amount,
         p.razorpay_order_id, p.razorpay_payment_id, COALESCE(p.captured_at, p.created_at) AS paid_at
         FROM bookings b JOIN parking_spaces ps ON ps.id = b.parking_space_id JOIN users u ON u.id = b.seeker_id
         JOIN payments p ON p.booking_id = b.id
         WHERE b.id = $1 AND b.seeker_id = $2 AND p.status IN ('SUCCESS','REFUNDED')
         ORDER BY p.id DESC LIMIT 1`, [req.params.id, req.user.userId]
    );
    if (!receipt) throw bookingError(404, "No verified payment receipt found for this booking.");
    res.set("Cache-Control", "no-store").json({ receipt });
});

const cancelBooking = bookingHandler(async (req, res) => {
    if (!positiveId(req.params.id)) throw bookingError(400, "Invalid booking ID.");
    const result = await transaction(async client => {
        const { rows: [booking] } = await client.query(
            `SELECT b.id, b.status, b.seeker_id, ps.owner_id,
                    (b.date + b.start_time) AT TIME ZONE $3 > clock_timestamp() AS before_start,
                    b.expires_at IS NOT NULL AND b.expires_at <= clock_timestamp() AS expired
             FROM bookings b JOIN parking_spaces ps ON ps.id = b.parking_space_id
             WHERE b.id = $1 AND (b.seeker_id = $2 OR ps.owner_id = $2) FOR UPDATE OF b`,
            [req.params.id, req.user.userId, parkingTimeZone]
        );
        if (!booking) throw bookingError(404, "Booking not found.");
        if (booking.status === "CANCELLED") return { booking, replay: true };
        if (!["PENDING_PAYMENT","CONFIRMED"].includes(booking.status) || !booking.before_start ||
            booking.status === "PENDING_PAYMENT" && booking.expired) {
            throw bookingError(409, "Only unpaid or confirmed bookings can be cancelled before the start time.");
        }
        let payment;
        if (booking.status === "CONFIRMED") {
            const { rows: [paid] } = await client.query(
                `SELECT * FROM payments WHERE booking_id = $1 AND status = 'SUCCESS' ORDER BY id DESC LIMIT 1 FOR UPDATE`, [booking.id]
            );
            payment = await reserveRefund(client, paid);
        }
        await client.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [booking.id]);
        await notifyBooking(client, booking.id, "cancelled", [booking.seeker_id, booking.owner_id].map(userId =>
            [userId, "BOOKING_CANCELLED", "Booking cancelled", `Booking #${booking.id} was cancelled.`]));
        return { booking: { ...booking, status: "CANCELLED" }, payment };
    });
    if (result.payment) await submitReservedRefund(result.payment).catch(() => {});
    const { rows: [payment] } = await db.query(
        `SELECT refund_status FROM payments WHERE booking_id = $1 AND status IN ('SUCCESS','REFUNDED') ORDER BY id DESC LIMIT 1`, [result.booking.id]
    );
    const refundStatus = payment?.refund_status || "NOT_REQUESTED";
    res.status(refundStatus === "PENDING" ? 202 : 200).json({
        booking: { id: result.booking.id, status: result.booking.status },
        refundStatus, message: refundStatus === "PENDING" ? "Booking cancelled. Your refund is pending." : "Booking cancelled."
    });
});

function entryMethod(kind) {
    return bookingHandler(async (req, res) => {
        const token = kind === "qr" ? readQr(req.body.qr) : null;
        const id = kind === "qr" ? token?.id : req.params.id;
        const otp = req.body.otp;
        if (!positiveId(id) || kind === "otp" && (typeof otp !== "string" || !/^\d{6}$/.test(otp))) {
            throw bookingError(400, kind === "qr" ? "Invalid ParkShare QR pass." : "Enter a six-digit booking OTP.");
        }
        const result = await transaction(async client => {
            const { rows: [booking] } = await client.query(
                `SELECT b.*, clock_timestamp() >= (b.date + b.start_time) AT TIME ZONE $3
                     AND clock_timestamp() < (b.date + b.end_time) AT TIME ZONE $3 AS entry_open
                 FROM bookings b JOIN parking_spaces ps ON ps.id = b.parking_space_id
                 WHERE b.id = $1 AND ps.owner_id = $2 FOR UPDATE OF b`, [id, req.user.userId, parkingTimeZone]
            );
            if (!booking) throw bookingError(404, "Booking not found for this owner.");
            if (booking.status !== "CONFIRMED") throw bookingError(409, "Entry has already been recorded or this booking is not confirmed.");
            if (!booking.entry_open) throw bookingError(409, "Entry is only allowed during the booked date and time.");
            if (kind === "qr" && (!booking.pass_nonce || token.nonce !== booking.pass_nonce)) throw bookingError(400, "Invalid ParkShare QR pass.");
            if (kind === "legacy" && !booking.otp_verified) throw bookingError(400, "A booking QR pass or OTP is required.");
            if (kind === "otp") {
                if (booking.otp_locked) throw bookingError(429, "OTP attempts are locked. Use the booking QR code.");
                if (!validOtp(booking, otp)) {
                    await client.query("UPDATE bookings SET otp_attempts = otp_attempts + 1, otp_locked = otp_attempts + 1 >= 5 WHERE id = $1", [id]);
                    return null;
                }
            }
            const { rows: [updated] } = await client.query(
                `UPDATE bookings SET otp_verified = TRUE, status = 'ACTIVE', checkin_time = NOW()
                 WHERE id = $1 RETURNING id, seeker_id, status, otp_verified, checkin_time`, [id]
            );
            await notifyBooking(client, updated.id, "entry", [updated.seeker_id, req.user.userId].map(userId =>
                [userId, "VEHICLE_ENTRY", "Vehicle entered", `Entry for booking #${updated.id} was recorded.`]));
            return updated;
        });
        if (!result) throw bookingError(400, "Incorrect booking OTP.");
        return res.json({ message: "Vehicle entry recorded.", booking: result });
    });
}

module.exports = { passDetails, bookingReceipt, cancelBooking,
    verifyCheckinOtp: entryMethod("otp"), verifyCheckinQr: entryMethod("qr"), checkinBooking: entryMethod("legacy") };
