const db = require("../config/db");
const { withOwnedParking, httpError } = require("../services/ownedParking");
const { positiveId, validWindow } = require("../services/parkingValidation");

const slotColumns = "id, parking_space_id, date::text AS date, start_time, end_time, status, source";
const liveStatuses = "'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'CANCELLATION_PENDING'";

async function checkReservations(client, parkingId, date, start, end) {
    const { rowCount } = await client.query(
        `SELECT 1 FROM bookings WHERE parking_space_id = $1 AND date = $2
         AND status IN (${liveStatuses}) AND (status <> 'PENDING_PAYMENT' OR expires_at IS NULL OR expires_at > clock_timestamp()) AND start_time < $4 AND end_time > $3 LIMIT 1`,
        [parkingId, date, start, end]
    );
    if (rowCount) throw httpError(409, "This time overlaps an existing reservation.");
}

async function saveSlot(req, client, parking, slot, status) {
    const date = req.body.date ?? slot?.date;
    const start = req.body.start_time ?? slot?.start_time;
    const end = req.body.end_time ?? slot?.end_time;

    if (!validWindow(date, start, end)) throw httpError(400, "Enter a valid date and a time range within that day.");
    await checkReservations(client, parking.id, date, start, end);
    const { rowCount } = await client.query(
        `SELECT 1 FROM availability_slots WHERE parking_space_id = $1 AND date = $2 AND status = $5
         AND start_time < $4 AND end_time > $3 AND id IS DISTINCT FROM $6 LIMIT 1`,
        [parking.id, date, start, end, status, slot?.id ?? null]
    );
    if (rowCount) throw httpError(409, "This time overlaps another slot of the same type.");
    const { rows: [updated] } = slot
        ? await client.query(
            `UPDATE availability_slots SET date = $2, start_time = $3, end_time = $4, status = $5,
             source = 'manual', rule_id = NULL WHERE id = $1 RETURNING ${slotColumns}`,
            [slot.id, date, start, end, status]
        )
        : await client.query(
            `INSERT INTO availability_slots (parking_space_id, date, start_time, end_time, status, source)
             VALUES ($1,$2,$3,$4,$5,'manual') RETURNING ${slotColumns}`,
            [parking.id, date, start, end, status]
        );
    return [slot ? 200 : 201, { slot: updated }];
}

const createAvailabilitySlot = withOwnedParking((req, client, parking) => saveSlot(req, client, parking, null, "open"));

const blockAvailabilitySlot = withOwnedParking((req, client, parking) => {
    if (req.body.start_time === undefined && req.body.end_time === undefined) {
        Object.assign(req.body, { start_time: "00:00", end_time: "24:00" });
    }
    return saveSlot(req, client, parking, null, "blocked");
});

async function existingSlot(req, client, parking) {
    if (!positiveId(req.params.slotId)) throw httpError(400, "Invalid slot ID.");
    const { rows: [slot] } = await client.query(
        `SELECT ${slotColumns} FROM availability_slots WHERE id = $1 AND parking_space_id = $2`,
        [req.params.slotId, parking.id]
    );
    if (!slot) throw httpError(404, "Availability slot not found.");
    await checkReservations(client, parking.id, slot.date, slot.start_time, slot.end_time);
    return slot;
}

const updateAvailabilitySlot = withOwnedParking(async (req, client, parking) => {
    const slot = await existingSlot(req, client, parking);
    return saveSlot(req, client, parking, slot, slot.status);
});

const deleteAvailabilitySlot = withOwnedParking(async (req, client, parking) => {
    const slot = await existingSlot(req, client, parking);
    await client.query("DELETE FROM availability_slots WHERE id = $1", [slot.id]);
    return [200, { message: "Availability slot deleted." }];
});

async function getAvailabilitySlots(req, res) {
    if (!positiveId(req.params.id)) return res.status(400).json({ message: "Invalid parking ID." });
    const { rows: [parking] } = await db.query(
        `SELECT id FROM parking_spaces WHERE id = $1 AND archived_at IS NULL
         AND (owner_id = $2 OR $3 = 'admin' OR approval_status = 'APPROVED' AND is_available AND admin_deactivated_at IS NULL
             AND EXISTS (SELECT 1 FROM users WHERE id = parking_spaces.owner_id AND account_status = 'ACTIVE'))`,
        [req.params.id, req.user.userId, req.user.role]
    );
    if (!parking) return res.status(404).json({ message: "Parking listing not found." });
    const { rows } = await db.query(
        `SELECT ${slotColumns} FROM availability_slots WHERE parking_space_id = $1 ORDER BY date, start_time`,
        [parking.id]
    );
    return res.json({ slots: rows });
}

const getReservations = withOwnedParking(async (req, client, parking) => {
    const { rows } = await client.query(
        `SELECT b.id, b.date::text AS date, b.start_time, b.end_time, b.status, u.name AS seeker_name
         FROM bookings b JOIN users u ON u.id = b.seeker_id
         WHERE b.parking_space_id = $1 AND b.status IN (${liveStatuses})
           AND (b.status <> 'PENDING_PAYMENT' OR b.expires_at IS NULL OR b.expires_at > clock_timestamp()) ORDER BY b.date, b.start_time`, [parking.id]
    );
    return [200, { reservations: rows }];
});

module.exports = { createAvailabilitySlot, getAvailabilitySlots, blockAvailabilitySlot,
    updateAvailabilitySlot, deleteAvailabilitySlot, getReservations, liveStatuses };
