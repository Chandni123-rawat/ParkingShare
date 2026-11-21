const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { createBooking, getBookingQuote } = require("../controllers/bookingReservationController");
const { getBookingById, getMyBookings, getOwnerBookings, checkoutBooking } = require("../controllers/bookingController");
const { cancelBooking, passDetails, bookingReceipt, checkinBooking, verifyCheckinOtp, verifyCheckinQr } =
    require("../controllers/bookingAccessController");

const router = express.Router();
const owner = authorizeRoles("owner", "both");
router.use(authenticate);
router.post("/quote", getBookingQuote);
router.post("/create", createBooking);
router.get("/my", getMyBookings);
router.get("/owner", owner, getOwnerBookings);
router.post("/owner/verify-qr", owner, verifyCheckinQr);
router.get("/:id/pass", passDetails);
router.get("/:id/receipt", bookingReceipt);
router.patch("/:id/verify-otp", owner, verifyCheckinOtp);
router.patch("/:id/checkin", owner, checkinBooking);
router.patch("/:id/checkout", owner, checkoutBooking);
router.patch("/:id/cancel", cancelBooking);
router.get("/:id", getBookingById);
module.exports = router;
