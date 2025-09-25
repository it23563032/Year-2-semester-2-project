const express = require("express");
const AuthController = require("../Controllers/AuthControllers");

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", AuthController.protect, AuthController.getMe);

module.exports = router;