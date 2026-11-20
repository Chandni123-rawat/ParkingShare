const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { getOwnerEarnings } = require("../controllers/ownerController");

const router = express.Router();
router.get("/earnings", authenticate, authorizeRoles("owner"), getOwnerEarnings);
module.exports = router;