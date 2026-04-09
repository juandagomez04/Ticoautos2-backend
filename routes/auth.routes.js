const express = require("express");
const router = express.Router();

const { register, token, googleAuth, validateCedula } = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/token", token);
router.post("/google", googleAuth);
router.get("/cedula/:numero", validateCedula);

// endpoint de prueba (protegido)
router.get("/me", authenticateToken, (req, res) => {
    res.json({ message: "OK ✅", user: req.user });
});

module.exports = router;