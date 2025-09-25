
const express = require("express");
const UserController = require("../Controllers/UserControllers");

const router = express.Router();

router.get("/", UserController.getAllUsers);
router.post("/", UserController.addUsers);
router.get("/:id", UserController.getById);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

// Add debug route BEFORE exporting
router.get("/debug/ids", UserController.getAllUserIds);

// Make sure to export the router AFTER all routes are defined
module.exports = router;
