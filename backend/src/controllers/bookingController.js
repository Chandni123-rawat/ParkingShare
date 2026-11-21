const db = require("../config/db");
const { positiveId } = require("../services/parkingValidation");
const { notifyBooking } = require("../services/notificationService");
const { parkingTimeZone } = require("../services/bookingPass");

function notifyExit(client, booking, ownerId, automatic = false) {
    const message = automatic
        ? `Booking #${booking.id} reached its scheduled end and was checked out automatically.`
        : `Vehicle exit for booking #${booking.id} was recorded.`;
    return notifyBooking(client, booking.id, "exit", [
        [booking.seeker_id, "VEHICLE_EXIT", automatic ? "Booking ended" : "Vehicle exited", message],
        [ownerId, "VEHICLE_EXIT", automatic ? "Booking ended" : "Vehicle exited", message]
    ]);
}

const getBookingById = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user.userId;

        if (!positiveId(bookingId)) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }

        const result = await db.query(
            `SELECT
                b.id,
                b.seeker_id,
                ps.owner_id AS owner_id,
                $2::integer AS current_user_id,
                u.name AS customer_name,
                COALESCE(p.status, 'UNPAID') AS payment_status, p.refund_status,
                b.status IN ('PENDING_PAYMENT','CONFIRMED') AND (b.date + b.start_time) AT TIME ZONE $3 > clock_timestamp()
                  AND (b.status <> 'PENDING_PAYMENT' OR b.expires_at IS NULL OR b.expires_at > clock_timestamp()) AS can_cancel,
                b.parking_space_id,
                b.vehicle_id,
                b.date::text AS date,
                b.start_time,
                b.end_time,
                b.amount,
                CASE WHEN b.status = 'PENDING_PAYMENT' AND b.expires_at <= clock_timestamp() THEN 'EXPIRED' ELSE b.status END AS status,
                b.expires_at,
                b.checkin_time,
                b.checkout_time,
                b.otp_verified,
                b.created_at,
                COALESCE(b.vehicle_number_snapshot, v.vehicle_number) AS vehicle_number,
                ps.title AS parking_title,
                ps.address AS parking_address,
                COALESCE(b.vehicle_number_snapshot, v.vehicle_number) AS vehicle_number,
                v.vehicle_type
             FROM bookings b
             JOIN parking_spaces ps
               ON b.parking_space_id = ps.id
             JOIN users u ON u.id = b.seeker_id
             LEFT JOIN vehicles v ON b.vehicle_id = v.id
             LEFT JOIN LATERAL (
                SELECT status, refund_status FROM payments WHERE booking_id = b.id
                ORDER BY CASE WHEN status IN ('SUCCESS','REFUNDED') THEN 0 ELSE 1 END, id DESC LIMIT 1
             ) p ON true
             WHERE b.id = $1
               AND (
                   b.seeker_id = $2
                   OR ps.owner_id = $2
               )`,
            [bookingId, userId, parkingTimeZone]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        return res.status(200).json({
            booking: result.rows[0]
        });

    } catch (error) {
        console.error("Get booking error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            `SELECT
                b.id,
                b.parking_space_id,
                b.date::text AS date,
                b.start_time,
                b.end_time,
                b.amount,
                CASE WHEN b.status = 'PENDING_PAYMENT' AND b.expires_at <= clock_timestamp() THEN 'EXPIRED' ELSE b.status END AS status,
                b.expires_at,
                b.checkin_time,
                b.checkout_time,
                b.created_at,
                ps.title AS parking_title,
                ps.address AS parking_address,
                COALESCE(p.status, 'UNPAID') AS payment_status, p.refund_status,
                b.status IN ('PENDING_PAYMENT','CONFIRMED') AND (b.date + b.start_time) AT TIME ZONE $2 > clock_timestamp()
                  AND (b.status <> 'PENDING_PAYMENT' OR b.expires_at IS NULL OR b.expires_at > clock_timestamp()) AS can_cancel
             FROM bookings b
             JOIN parking_spaces ps
                ON b.parking_space_id = ps.id
             LEFT JOIN vehicles v ON b.vehicle_id = v.id
             LEFT JOIN LATERAL (
                SELECT status, refund_status FROM payments WHERE booking_id = b.id
                ORDER BY CASE WHEN status IN ('SUCCESS','REFUNDED') THEN 0 ELSE 1 END, id DESC LIMIT 1
             ) p ON true
             WHERE b.seeker_id = $1
             ORDER BY b.created_at DESC`,
            [userId, parkingTimeZone]
        );

        res.status(200).json({
            bookings: result.rows
        });

    } catch (error) {
        console.error("Get my bookings error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};


const getOwnerBookings = async (req, res) => {
    try {
        const ownerId = req.user.userId;

        const result = await db.query(
            `SELECT
                b.id,
                b.seeker_id,
                b.parking_space_id,
                b.vehicle_id,
                b.date::text AS date,
                b.start_time,
                b.end_time,
                b.amount,
                CASE WHEN b.status = 'PENDING_PAYMENT' AND b.expires_at <= clock_timestamp() THEN 'EXPIRED' ELSE b.status END AS status,
                b.expires_at,
                b.checkin_time,
                b.checkout_time,
                b.otp_verified,
                b.created_at,
                COALESCE(p.status, 'UNPAID') AS payment_status,
                p.refund_status,

                ps.title AS parking_title,
                ps.address AS parking_address,

                u.name AS seeker_name,
                u.email AS seeker_email,
                u.phone AS seeker_phone,

                COALESCE(b.vehicle_number_snapshot, v.vehicle_number) AS vehicle_number,
                v.vehicle_type

             FROM bookings b

             JOIN parking_spaces ps
                ON b.parking_space_id = ps.id

             JOIN users u
                ON b.seeker_id = u.id

             LEFT JOIN vehicles v
                ON b.vehicle_id = v.id

             LEFT JOIN LATERAL (
                 SELECT status, refund_status FROM payments WHERE booking_id = b.id
                 ORDER BY CASE WHEN status IN ('SUCCESS', 'REFUNDED') THEN 0 ELSE 1 END, id DESC LIMIT 1
             ) p ON true
             WHERE ps.owner_id = $1
             ORDER BY b.created_at DESC`,
            [ownerId]
        );

        res.status(200).json({
            bookings: result.rows
        });

    } catch (error) {
        console.error("Get owner bookings error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};


const checkoutBooking = async (req, res) => {
    const client = await db.connect();
    let transactionStarted = false;

    try {
        const bookingId = req.params.id;
        const ownerId = req.user.userId;
        if (!positiveId(bookingId)) return res.status(400).json({ message: "Invalid booking ID." });

        await client.query("BEGIN");
        transactionStarted = true;

        // 1. Complete the booking only if this owner owns it
        const result = await client.query(
            `UPDATE bookings b
             SET status = 'COMPLETED',
                 checkout_time = CURRENT_TIMESTAMP
             FROM parking_spaces ps
             WHERE b.id = $1
               AND b.parking_space_id = ps.id
               AND ps.owner_id = $2
               AND b.status = 'ACTIVE'
             RETURNING
                b.id,
                b.parking_space_id,
                b.vehicle_id,
                b.date::text AS date,
                b.start_time,
                b.end_time,
                b.amount,
                CASE WHEN b.status = 'PENDING_PAYMENT' AND b.expires_at <= clock_timestamp() THEN 'EXPIRED' ELSE b.status END AS status,
                b.checkin_time,
                b.checkout_time,
                b.seeker_id`,
            [bookingId, ownerId]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                message: "Booking cannot be checked out or has already been completed."
            });
        }

        const booking = result.rows[0];

        // 2. Confirm that payment succeeded
        const paymentResult = await client.query(
            `SELECT amount
             FROM payments
             WHERE booking_id = $1
               AND status = 'SUCCESS'
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE`,
            [bookingId]
        );

        if (paymentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "Successful payment not found"
            });
        }

        // 3. Read the configurable commission rate
        const configResult = await client.query(
            `SELECT value
             FROM platform_config
             WHERE key = 'commission_rate'`
        );

        if (configResult.rows.length === 0) {
            throw new Error("Commission configuration not found");
        }

        const commissionRate = Number(configResult.rows[0].value);

        if (
            !Number.isFinite(commissionRate) ||
            commissionRate < 0 ||
            commissionRate > 1
        ) {
            throw new Error("Invalid commission rate");
        }

        // 4. Calculate the owner's earnings
        const grossAmount = Number(paymentResult.rows[0].amount);

        const platformFee = Number(
            (grossAmount * commissionRate).toFixed(2)
        );

        const ownerEarning = Number(
            (grossAmount - platformFee).toFixed(2)
        );

        // 5. Create one settlement record per booking
        await client.query(
            `INSERT INTO wallet_settlements (
                owner_id,
                booking_id,
                gross_amount,
                platform_fee,
                owner_earning,
                status
             )
             VALUES ($1, $2, $3, $4, $5, 'pending')
             ON CONFLICT (booking_id) DO NOTHING`,
            [
                ownerId,
                bookingId,
                grossAmount,
                platformFee,
                ownerEarning
            ]
        );

        // 6. Fetch vehicle details
        const vehicleResult = await client.query(
            `SELECT id, vehicle_number, vehicle_type
             FROM vehicles
             WHERE id = $1`,
            [booking.vehicle_id]
        );

        await notifyExit(client, booking, ownerId);
        await notifyBooking(client, booking.id, "earnings", [[ownerId, "OWNER_EARNINGS_UPDATED", "Earnings updated",
            `Earnings for booking #${booking.id} were added to your settlement balance.`]]);
        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            message: "Check-out successful",
            booking: {
                ...booking,
                vehicle: vehicleResult.rows[0] || null
            }
        });

    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }

        console.error("Check-out error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });

    } finally {
        client.release();
    }
};


const autoCheckoutExpiredSessions = async () => {
    const client = await db.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        // Find active sessions whose scheduled end time has passed.
        // SKIP LOCKED prevents two workers from processing the same booking.
        const expiredResult = await client.query(`
            SELECT
                b.id,
                b.parking_space_id,
                b.seeker_id,
                b.amount,
                b.date::text AS date,
                b.end_time,
                ps.owner_id
            FROM bookings b
            JOIN parking_spaces ps
                ON ps.id = b.parking_space_id
            WHERE b.status = 'ACTIVE'
              AND (
                  (b.date + b.end_time)
                  AT TIME ZONE $1
              ) <= NOW()
            ORDER BY b.id
            FOR UPDATE OF b SKIP LOCKED
        `, [parkingTimeZone]);

        for (const booking of expiredResult.rows) {
            // Only complete sessions that have a successful payment.
            const paymentResult = await client.query(
                `SELECT id, amount
                 FROM payments
                 WHERE booking_id = $1
                   AND status = 'SUCCESS'
                 ORDER BY created_at DESC
                 LIMIT 1
                 FOR UPDATE`,
                [booking.id]
            );

            if (paymentResult.rows.length === 0) {
                console.error(
                    `Auto-checkout skipped: successful payment missing for booking ${booking.id}`
                );
                continue;
            }

            // Complete the booking.
            const updateResult = await client.query(
                `UPDATE bookings
                 SET status = 'COMPLETED',
                     checkout_time = CURRENT_TIMESTAMP
                 WHERE id = $1
                   AND status = 'ACTIVE'
                 RETURNING id`,
                [booking.id]
            );

            if (updateResult.rows.length === 0) {
                continue;
            }

            // Read platform commission rate.
            const configResult = await client.query(
                `SELECT value
                 FROM platform_config
                 WHERE key = 'commission_rate'`
            );

            if (configResult.rows.length === 0) {
                throw new Error("Commission configuration not found");
            }

            const commissionRate = Number(configResult.rows[0].value);

            if (
                !Number.isFinite(commissionRate) ||
                commissionRate < 0 ||
                commissionRate > 1
            ) {
                throw new Error("Invalid commission rate");
            }

            // Calculate commission and owner's earnings.
            const grossAmount = Number(paymentResult.rows[0].amount);
            const platformFee = Number(
                (grossAmount * commissionRate).toFixed(2)
            );
            const ownerEarning = Number(
                (grossAmount - platformFee).toFixed(2)
            );

            // Create settlement only once per booking.
            await client.query(
                `INSERT INTO wallet_settlements (
                    owner_id,
                    booking_id,
                    gross_amount,
                    platform_fee,
                    owner_earning,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, 'pending')
                ON CONFLICT (booking_id) DO NOTHING`,
                [
                    booking.owner_id,
                    booking.id,
                    grossAmount,
                    platformFee,
                    ownerEarning
                ]
            );

            await notifyExit(client, booking, booking.owner_id, true);
            console.log(
                `Automatic checkout completed for booking ${booking.id}`
            );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return expiredResult.rows.length;
    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }

        console.error("Automatic checkout error:", error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { getBookingById, getMyBookings, getOwnerBookings, checkoutBooking, autoCheckoutExpiredSessions };
