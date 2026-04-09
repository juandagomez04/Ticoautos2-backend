const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user.model");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /auth/register
async function register(req, res) {
  try {
    const { name, lastName, email, password } = req.body;

    if (!name || !lastName || !email || !password) {
      return res.status(400).json({ message: "Faltan datos: name, lastName, email, password." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener mínimo 6 caracteres." });
    }

    const cleanEmail = email.toLowerCase().trim();

    const exists = await User.exists({ email: cleanEmail });
    if (exists) return res.status(409).json({ message: "Ese email ya está registrado." });

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await User.create({
      name: name.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      passwordHash,
    });

    return res.status(201).json({
      _id: created._id,
      name: created.name,
      lastName: created.lastName,
      email: created.email,
      createdAt: created.createdAt,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// POST /auth/token  (login)
async function token(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Email y password son requeridos." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Credenciales inválidas." });

    // Usuario registrado con Google no tiene contraseña
    if (!user.passwordHash) {
      return res.status(401).json({ message: "Esta cuenta fue creada con Google. Usá el botón de Google para ingresar." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas." });

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({ token: jwtToken });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// POST /auth/google
async function googleAuth(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Token de Google requerido." });
    }

    // Verificar el token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: name, family_name: lastName } = payload;

    // Buscar si el usuario ya existe por googleId o por email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // Registro nuevo con Google
      user = await User.create({
        name,
        lastName: lastName || "",
        email,
        googleId,
      });
    } else if (!user.googleId) {
      // Ya existe por email (registrado con contraseña), vincular su googleId
      user.googleId = googleId;
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({ token: jwtToken });
  } catch (e) {
    console.error("Error en Google Auth:", e.message);
    return res.status(401).json({ message: "Token de Google inválido o expirado." });
  }
}

module.exports = { register, token, googleAuth };