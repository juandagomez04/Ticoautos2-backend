const express = require("express");
const router  = express.Router();

const { register, token, verify2FA, googleAuth, validateCedula, verifyEmail } = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.post("/register",      register);
router.post("/token",         token);
router.post("/verify-2fa",    verify2FA);
router.post("/google",        googleAuth);
router.get("/cedula/:numero", validateCedula);
router.get("/verify/:token",  verifyEmail);

// Endpoint protegido de prueba
router.get("/me", authenticateToken, (req, res) => {
    res.json({ message: "OK ✅", user: req.user });
});

module.exports = router;
