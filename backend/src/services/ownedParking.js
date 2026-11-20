const db = require("../config/db");
const { positiveId } = require("./parkingValidation");

function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

function withOwnedParking(operation) {
    return async function handle(req, res, next) {
        const id = Number(req.params.id);
        if (!positiveId(req.params.id)) return res.status(400).json({ message: "Invalid parking ID." });
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const { rows: [parking] } = await client.query(
                "SELECT * FROM parking_spaces WHERE id = $1 AND owner_id = $2 AND archived_at IS NULL FOR UPDATE",
                [id, req.user.userId]
            );
            if (!parking) throw httpError(404, "Parking listing not found.");
            const [status, data] = await operation(req, client, parking);
            await client.query("COMMIT");
            return res.status(status).json(data);
        } catch (error) {
            await client.query("ROLLBACK");
            if (error.status) return res.status(error.status).json({ message: error.message });
            return next(error);
        } finally {
            client.release();
        }
    };
}

module.exports = { withOwnedParking, httpError };
