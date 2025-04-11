const express = require("express");
const { signup, login, logout } = require("../controllers/auth.controller.js");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout); // Logout is handled client-side, but keeping a route

module.exports = router;
