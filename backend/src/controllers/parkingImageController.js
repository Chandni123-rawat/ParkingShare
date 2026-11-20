const { randomUUID } = require("node:crypto");
const db = require("../config/db");
const { withOwnedParking, httpError } = require("../services/ownedParking");

const prefix = "/api/parking/images/";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function imageType(bytes) {
    if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
    if (bytes.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
    if (/^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6))) return "image/gif";
    if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
    return null;
}

const uploadParkingImages = withOwnedParking(async (req, client, parking) => {
    const photos = parking.photos || [];
    if (!req.files?.length || photos.length + req.files.length > 5) {
        throw httpError(400, "Select images within the limit of five per listing.");
    }
    const uploadedImages = [];
    for (const file of req.files) {
        const type = imageType(file.buffer);
        if (!type) throw httpError(400, "Upload a JPEG, PNG, WebP or GIF image.");
        const id = randomUUID();
        await client.query(
            "INSERT INTO parking_images (id, parking_space_id, content_type, contents) VALUES ($1, $2, $3, $4)",
            [id, parking.id, type, file.buffer]
        );
        uploadedImages.push({ url: prefix + id });
    }
    const updated = await setPhotos(client, parking.id, photos.concat(uploadedImages.map(file => file.url)));
    return [201, { parking: updated, uploadedImages, message: "Parking images uploaded." }];
});

const deleteParkingImage = withOwnedParking(async (req, client, parking) => {
    const { imageUrl } = req.body;
    if (typeof imageUrl !== "string" || !parking.photos?.includes(imageUrl)) {
        throw httpError(404, "Image not found in this listing.");
    }
    const id = imageUrl.startsWith(prefix) && imageUrl.slice(prefix.length);
    if (id && uuid.test(id)) {
        await client.query("DELETE FROM parking_images WHERE id = $1 AND parking_space_id = $2", [id, parking.id]);
    }
    const updated = await setPhotos(client, parking.id, parking.photos.filter(photo => photo !== imageUrl));
    return [200, { parking: updated, message: "Image removed from the listing." }];
});

async function setPhotos(client, id, photos) {
    const { rows: [updated] } = await client.query(
        `UPDATE parking_spaces SET photos = $2,
         approval_status = CASE WHEN approval_status = 'REJECTED' THEN 'PENDING' ELSE approval_status END,
         rejection_reason = CASE WHEN approval_status = 'REJECTED' THEN NULL ELSE rejection_reason END
         WHERE id = $1 RETURNING id, photos, approval_status, rejection_reason`, [id, photos]
    );
    return updated;
}

async function getParkingImage(req, res) {
    if (!uuid.test(req.params.imageId)) return res.sendStatus(404);
    const { rows: [image] } = await db.query(
        `SELECT i.content_type, i.contents FROM parking_images i
         JOIN parking_spaces p ON p.id = i.parking_space_id
         WHERE i.id = $1`, [req.params.imageId]
    );
    if (!image) return res.sendStatus(404);
    return res.set({ "Content-Type": image.content_type, "X-Content-Type-Options": "nosniff" }).send(image.contents);
}

module.exports = { uploadParkingImages, deleteParkingImage, getParkingImage };
