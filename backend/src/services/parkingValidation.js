const positiveId = value => /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 2147483647;

function validDate(date) {
    if (typeof date !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + "T00:00:00Z");
    return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === date;
}

const validTime = time => typeof time === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time);
const fullTime = time => time.length === 5 ? time + ":00" : time;
const validWindow = (date, start, end) => validDate(date) && validTime(start) &&
    (validTime(end) || end === "24:00" || end === "24:00:00") && fullTime(start) < fullTime(end);

function listingFields(body, creating) {
    const { title, description, address, latitude, longitude, price_per_hour, capacity, vehicle_types, is_available } = body;
    const text = (value, max, required = false) => value === undefined ? !required :
        typeof value === "string" && value.trim().length <= max && (!required || value.trim().length > 0);
    const number = (value, min, max, required = false) => value === undefined ? !required :
        (typeof value === "number" || typeof value === "string" && value.trim() !== "") &&
        Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
    if (!text(title, 150, creating || title !== undefined) || !text(address, 1000, creating || address !== undefined) ||
        !text(description, 4000) || !number(latitude, -90, 90, creating) || !number(longitude, -180, 180, creating) ||
        !number(price_per_hour, 0.01, 999999.99, creating) ||
        !number(capacity, 1, 500) || capacity !== undefined && !Number.isInteger(Number(capacity)) ||
        vehicle_types !== undefined && (!Array.isArray(vehicle_types) || !vehicle_types.length ||
            vehicle_types.length !== new Set(vehicle_types).size || !vehicle_types.every(type => ["car", "bike"].includes(type))) ||
        is_available !== undefined && typeof is_available !== "boolean") return null;
    return [title?.trim(), description?.trim(), address?.trim(), latitude, longitude, price_per_hour,
        capacity ?? (creating ? 1 : null), vehicle_types ?? (creating ? ["car", "bike"] : null), is_available ?? (creating ? true : null)];
}

module.exports = { positiveId, validDate, validTime, validWindow, listingFields };
