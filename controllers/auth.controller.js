const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user.model");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// GET /auth/cedula/:numero — consulta al microservicio del padrón
async function validateCedula(req, res) {
  try {
    const { numero } = req.params;

    if (!numero) {
      return res.status(400).json({ message: "Número de cédula requerido." });
    }

    // Consulta al microservicio del padrón
    const response = await fetch(`http://localhost:3002/cedula/${numero}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(404).json({ message: data.message || "Cédula no encontrada en el padrón." });
    }

    return res.status(200).json({
      nombre: data.nombre,
      apellido1: data.apellido1,
      apellido2: data.apellido2,
      sexo: data.sexo,
      esMayorDeEdad: data.esMayorDeEdad,
    });
  } catch (e) {
    console.error("Error validando cédula:", e.message);
    return res.status(500).json({ message: "Error al consultar el padrón." });
  }
}

// POST /auth/register
async function register(req, res) {
  try {
    const { name, lastName, email, password, cedula, birthDate } = req.body;

    if (!name || !lastName || !email || !password || !cedula) {
      return res.status(400).json({ message: "Faltan datos: name, lastName, email, password, cedula." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener mínimo 6 caracteres." });
    }

    // Verificar mayoría de edad si viene la fecha de nacimiento
    if (birthDate) {
      const fecha = new Date(birthDate);
      const hoy = new Date();
      const edad = hoy.getFullYear() - fecha.getFullYear();
      const cumplioEsteAnio =
        hoy.getMonth() > fecha.getMonth() ||
        (hoy.getMonth() === fecha.getMonth() && hoy.getDate() >= fecha.getDate());
      const edadReal = cumplioEsteAnio ? edad : edad - 1;
      if (edadReal < 18) {
        return res.status(403).json({ message: "Debes ser mayor de 18 años para registrarte." });
      }
    }

    const cleanEmail = email.toLowerCase().trim();
    const exists = await User.exists({ email: cleanEmail });
    if (exists) return res.status(409).json({ message: "Ese email ya está registrado." });

    const cedulaExists = await User.exists({ cedula });
    if (cedulaExists) return res.status(409).json({ message: "Esa cédula ya está registrada." });

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await User.create({
      name: name.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      passwordHash,
      cedula,
      birthDate: birthDate ? new Date(birthDate) : undefined,
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

module.exports = { register, token, googleAuth, validateCedula };