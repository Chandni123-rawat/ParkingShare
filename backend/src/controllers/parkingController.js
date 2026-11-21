const db = require("../config/db");
const { listingFields, positiveId } = require("../services/parkingValidation");
const { withOwnedParking, httpError } = require("../services/ownedParking");

async function createParking(req, res) {
    const fields = listingFields(req.body, true);
    if (!fields) return res.status(400).json({ message: "Enter valid listing details, coordinates, price, capacity and vehicle types." });
    const { rows: [parking] } = await db.query(
        `INSERT INTO parking_spaces
         (title, description, address, latitude, longitude, price_per_hour, capacity, vehicle_types, is_available, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [...fields, req.user.userId]
    );
    return res.status(201).json({ message: "Parking space submitted for admin review.", parking });
}

const getAllParkings = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                id,
                owner_id,
                title,
                description,
                address,
                latitude,
                longitude,
                price_per_hour, capacity, vehicle_types,
                is_available,
                photos,
                approval_status,
                created_at
             FROM parking_spaces p
             WHERE approval_status = 'APPROVED' AND archived_at IS NULL AND is_available AND admin_deactivated_at IS NULL
               AND EXISTS (SELECT 1 FROM users WHERE id = p.owner_id AND account_status = 'ACTIVE')
             ORDER BY created_at DESC`
        );

        return res.status(200).json({
            parkings: result.rows
        });
    } catch (error) {
        console.error("Get parkings error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};



const getParkingById = async (req, res) => {
    try {
        const parkingId = Number(req.params.id);
        const userId = req.user?.userId ?? null;
        const userRole = req.user?.role ?? null;

        if (!positiveId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid parking ID"
            });
        }

        const result = await db.query(
            `SELECT
                ps.id,
                ps.owner_id, u.name AS owner_name,
                ps.title,
                ps.description,
                ps.address,
                ps.latitude,
                ps.longitude,
                ps.price_per_hour, ps.capacity, ps.vehicle_types,
                ps.is_available, ps.admin_deactivated_at,
                ps.photos,
                ps.approval_status,
                ps.rejection_reason,
                ps.created_at
             FROM parking_spaces ps
             JOIN users u ON u.id = ps.owner_id
             WHERE ps.id = $1 AND ps.archived_at IS NULL
               AND (
                   (ps.approval_status = 'APPROVED' AND ps.is_available AND ps.admin_deactivated_at IS NULL AND u.account_status = 'ACTIVE')
                   OR ps.owner_id = $2
                   OR $3 = 'admin'
               )`,
            [parkingId, userId, userRole]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Parking space not found"
            });
        }

        return res.status(200).json({
            parking: result.rows[0]
        });
    } catch (error) {
        console.error("Get parking by ID error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};



const updateParking = withOwnedParking(async (req, client, parking) => {
    const fields = listingFields(req.body, false);
    if (req.body.is_available === true && !parking.is_available && parking.admin_deactivated_at) throw httpError(409, "An administrator deactivated this listing.");
    if (!fields) throw httpError(400, "Enter valid listing details, coordinates, price, capacity and vehicle types.");
    if (fields[6] !== null && Number(fields[6]) < parking.capacity) {
        const { rowCount } = await client.query(
            `SELECT 1 FROM bookings b WHERE b.parking_space_id = $1 AND b.date >= CURRENT_DATE
             AND b.status IN ('PENDING_PAYMENT','CONFIRMED','ACTIVE','CANCELLATION_PENDING')
             AND parking_peak_load($1, b.date, b.start_time, b.end_time) > $2 LIMIT 1`,
            [parking.id, fields[6]]
        );
        if (rowCount) throw httpError(409, "Capacity cannot be reduced below existing reservations.");
    }
    const { rows: [updated] } = await client.query(
        `UPDATE parking_spaces SET title = COALESCE($1, title), description = COALESCE($2, description),
         address = COALESCE($3, address), latitude = COALESCE($4, latitude), longitude = COALESCE($5, longitude),
         price_per_hour = COALESCE($6, price_per_hour), capacity = COALESCE($7, capacity),
         vehicle_types = COALESCE($8, vehicle_types), is_available = COALESCE($9, is_available),
         approval_status = CASE WHEN approval_status = 'REJECTED' AND $11 THEN 'PENDING' ELSE approval_status END,
         rejection_reason = CASE WHEN approval_status = 'REJECTED' AND $11 THEN NULL ELSE rejection_reason END
         WHERE id = $10 RETURNING *`, [...fields, parking.id, fields.slice(0, 8).some(value => value != null)]
    );
    return [200, { message: "Parking listing updated.", parking: updated }];
});

const deleteParking = withOwnedParking(async (req, client, parking) => {
    const { rowCount } = await client.query(
        "SELECT 1 FROM bookings WHERE parking_space_id = $1 LIMIT 1", [parking.id]
    );
    if (rowCount) {
        await client.query("UPDATE parking_spaces SET archived_at = NOW(), is_available = false WHERE id = $1", [parking.id]);
        return [200, { message: "Listing archived. Booking history is retained.", archived: true }];
    }
    await client.query("DELETE FROM parking_spaces WHERE id = $1", [parking.id]);
    return [200, { message: "Parking listing deleted.", archived: false }];
});

const getMyParkings = async (req, res) => {
    try {
        const ownerId = req.user.userId;

        const result = await db.query(
            `SELECT
                ps.id,
                ps.title,
                ps.description,
                ps.address,
                ps.latitude,
                ps.longitude,
                ps.price_per_hour, ps.capacity, ps.vehicle_types,
                ps.is_available, ps.admin_deactivated_at,
                ps.photos,
                ps.approval_status,
ps.rejection_reason,
                ps.created_at
             FROM parking_spaces ps
             WHERE ps.owner_id = $1 AND ps.archived_at IS NULL
             ORDER BY ps.created_at DESC`,
            [ownerId]
        );

        res.status(200).json({
            parkings: result.rows
        });

    } catch (error) {
        console.error("Get my parkings error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = { createParking, getAllParkings, getParkingById, updateParking, deleteParking, getMyParkings };
