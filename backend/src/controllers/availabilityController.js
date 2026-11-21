const db = require("../config/db");
const { withOwnedParking, httpError } = require("../services/ownedParking");
const { positiveId, validDate, validWindow } = require("../services/parkingValidation");
const { liveStatuses } = require("./availabilitySlotController");

const ruleFields = "id, parking_space_id, days_of_week, start_time, end_time, valid_from::text AS valid_from, valid_until::text AS valid_until";

function ruleValues(body) {
    const { days_of_week, start_time, end_time, valid_from, valid_until } = body;
    if (!Array.isArray(days_of_week) || !days_of_week.length ||
        !days_of_week.every(day => Number.isInteger(day) && day >= 0 && day <= 6) ||
        !validWindow(valid_from, start_time, end_time) ||
        valid_until && (!validDate(valid_until) || valid_until < valid_from)) {
        throw httpError(400, "Choose weekdays, a valid time range and valid start and end dates.");
    }
    return [[...new Set(days_of_week)], start_time, end_time, valid_from, valid_until || null];
}

async function generateSlots(client, rule) {
    await client.query(
        `INSERT INTO availability_slots (parking_space_id, date, start_time, end_time, status, source, rule_id)
         SELECT $1, $5::date + days.n, $3::time, $4::time, 'open', 'recurring', $7
         FROM generate_series(0, LEAST(30, COALESCE($6::date - $5::date, 30))) AS days(n)
         WHERE EXTRACT(DOW FROM $5::date + days.n)::integer = ANY($2::integer[])`,
        [rule.parking_space_id, rule.days_of_week, rule.start_time, rule.end_time, rule.valid_from, rule.valid_until, rule.id]
    );
}

const createAvailability = withOwnedParking(async (req, client, parking) => {
    const { rows: [rule] } = await client.query(
        `INSERT INTO availability_rules (parking_space_id, days_of_week, start_time, end_time, valid_from, valid_until)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${ruleFields}`, [parking.id, ...ruleValues(req.body)]
    );
    await generateSlots(client, rule);
    return [201, { availability: rule }];
});

async function clearFutureSlots(req, client, parking) {
    const id = req.params.availabilityId;
    if (!positiveId(id)) throw httpError(400, "Invalid availability rule ID.");
    const { rowCount } = await client.query(
        "SELECT 1 FROM availability_rules WHERE id = $1 AND parking_space_id = $2", [id, parking.id]
    );
    if (!rowCount) throw httpError(404, "Availability rule not found.");
    const conflicts = await client.query(
        `SELECT 1 FROM availability_slots s JOIN bookings b
           ON b.parking_space_id = s.parking_space_id AND b.date = s.date
          AND b.start_time < s.end_time AND b.end_time > s.start_time
         WHERE s.rule_id = $1 AND s.date >= CURRENT_DATE AND b.status IN (${liveStatuses})
           AND (b.status <> 'PENDING_PAYMENT' OR b.expires_at IS NULL OR b.expires_at > clock_timestamp()) LIMIT 1`, [id]
    );
    if (conflicts.rowCount) throw httpError(409, "This recurring rule contains an existing reservation.");
    await client.query("DELETE FROM availability_slots WHERE rule_id = $1 AND date >= CURRENT_DATE", [id]);
    return id;
}

const updateAvailability = withOwnedParking(async (req, client, parking) => {
    const values = ruleValues(req.body);
    const id = await clearFutureSlots(req, client, parking);
    const { rows: [rule] } = await client.query(
        `UPDATE availability_rules SET days_of_week = $1, start_time = $2, end_time = $3, valid_from = $4,
         valid_until = $5 WHERE id = $6 RETURNING ${ruleFields}`, [...values, id]
    );
    await generateSlots(client, rule);
    return [200, { availability: rule }];
});

const deleteAvailability = withOwnedParking(async (req, client, parking) => {
    const id = await clearFutureSlots(req, client, parking);
    await client.query("DELETE FROM availability_rules WHERE id = $1", [id]);
    return [200, { message: "Availability rule deleted." }];
});

async function getAvailability(req, res) {
    if (!positiveId(req.params.id)) return res.status(400).json({ message: "Invalid parking ID." });
    const { rows } = await db.query(
        `SELECT ${ruleFields} FROM availability_rules WHERE parking_space_id IN (
            SELECT id FROM parking_spaces WHERE id = $1 AND archived_at IS NULL
            AND (owner_id = $2 OR $3 = 'admin' OR approval_status = 'APPROVED' AND is_available AND admin_deactivated_at IS NULL
                AND EXISTS (SELECT 1 FROM users WHERE id = parking_spaces.owner_id AND account_status = 'ACTIVE'))
        ) ORDER BY id`, [req.params.id, req.user.userId, req.user.role]
    );
    return res.json({ availability: rows });
}

module.exports = { createAvailability, getAvailability, deleteAvailability, updateAvailability };
