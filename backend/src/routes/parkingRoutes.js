const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
    createParking,
    getAllParkings,
    getParkingById,
    updateParking,
    deleteParking,
    getMyParkings
} = require("../controllers/parkingController");

const { searchParking, getParkingSchedule } = require("../controllers/discoveryController");
const { getOwnerDashboard } = require("../controllers/ownerDashboardController");
const { uploadParkingImages, deleteParkingImage, getParkingImage } = require("../controllers/parkingImageController");
const { reportListing } = require("../controllers/adminOperationsController");
const router = express.Router();
router.post("/:id/report", authenticate, reportListing);
router.get("/images/:imageId", getParkingImage);

const {
    createAvailability,
    getAvailability,
    updateAvailability,
    deleteAvailability
} = require("../controllers/availabilityController");


const {
    createAvailabilitySlot,
    getAvailabilitySlots,
    blockAvailabilitySlot,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    getReservations
} = require("../controllers/availabilitySlotController");


router.get(//Important: is route ko /:id route se pehle rakhna.
    "/owner/dashboard",
    authenticate,
    authorizeRoles("owner", "both"),
    getOwnerDashboard
);

router.get(
    "/owner/my-parkings",
    authenticate,
    authorizeRoles("owner", "both"),
    getMyParkings
);


router.post( ///:id/availability ko /:id se upar rakhna important hai, taaki Express isko correctly match kare.
    "/:id/availability",
    authenticate,
    authorizeRoles("owner", "both"),
    createAvailability
);

router.get(
    "/:id/availability",
    authenticate,
    getAvailability
);
router.post(
    "/:id/slots",
    authenticate,
    authorizeRoles("owner", "both"),
    createAvailabilitySlot
);
router.get(
    "/:id/slots",
    authenticate,
    getAvailabilitySlots
);
router.patch("/:id/slots/:slotId", authenticate, authorizeRoles("owner", "both"), updateAvailabilitySlot);
router.delete("/:id/slots/:slotId", authenticate, authorizeRoles("owner", "both"), deleteAvailabilitySlot);
router.get("/:id/reservations", authenticate, authorizeRoles("owner", "both"), getReservations);
router.get("/", authenticate, getAllParkings);


router.get("/search", searchParking);
router.get("/:id/schedule", getParkingSchedule);
router.get("/:id", (req, res, next) => req.headers.authorization ? authenticate(req, res, next) : next(), getParkingById);

router.patch(
    "/:id",
    authenticate,
    authorizeRoles("owner", "both"),
    updateParking
);

router.delete(
    "/:id",
    authenticate,
    authorizeRoles("owner", "both"),
    deleteParking
);
router.post(
    "/",
    authenticate,
    authorizeRoles("owner", "both"),
    createParking
);

router.patch(
    "/:id/availability/:availabilityId",
    authenticate,
    authorizeRoles("owner", "both"),
    updateAvailability
);
router.delete(
    "/:id/availability/:availabilityId",
    authenticate,
    authorizeRoles("owner", "both"),
    deleteAvailability
);
router.post(
    "/:id/block",
    authenticate,
    authorizeRoles("owner", "both"),
    blockAvailabilitySlot
);

router.post(
    "/:id/images",
    authenticate,
    authorizeRoles("owner", "both"),
    upload.array("images", 5),
    uploadParkingImages
);

router.delete(
    "/:id/images",
    authenticate,
    authorizeRoles("owner", "both"),
    deleteParkingImage
);

module.exports = router;