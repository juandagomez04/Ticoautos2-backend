const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user.model");
const { sendVerificationEmail } = require("../services/email.service");
const { sendSmsCode } = require("../services/sms.service");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /auth/cedula/:numero — consulta al microservicio del padrón
async function validateCedula(req, res) {
  try {
    const { numero } = req.params;

    if (!numero) {
      return res.status(400).json({ message: "Número de cédula requerido." });
    }

    const response = await fetch(`http://localhost:3002/cedula/${numero}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(404).json({ message: data.message || "Cédula no encontrada en el padrón." });
    }

    return res.status(200).json({
      nombre:        data.nombre,
      apellido1:     data.apellido1,
      apellido2:     data.apellido2,
      sexo:          data.sexo,
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
    const { name, lastName, email, password, cedula, birthDate, phone } = req.body;

    if (!name || !lastName || !email || !password || !cedula || !phone) {
      return res.status(400).json({ message: "Faltan datos: name, lastName, email, password, cedula, phone." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener mínimo 6 caracteres." });
    }

    // Validar formato básico de teléfono (E.164: +XXXXXXXXXXX)
    if (!/^\+\d{7,15}$/.test(phone)) {
      return res.status(400).json({ message: "El teléfono debe estar en formato internacional (ej: +50688887777)." });
    }

    if (birthDate) {
      const fecha = new Date(birthDate);
      const hoy   = new Date();
      const edad  = hoy.getFullYear() - fecha.getFullYear();
      const cumplioEsteAnio =
        hoy.getMonth() > fecha.getMonth() ||
        (hoy.getMonth() === fecha.getMonth() && hoy.getDate() >= fecha.getDate());
      if ((cumplioEsteAnio ? edad : edad - 1) < 18) {
        return res.status(403).json({ message: "Debes ser mayor de 18 años para registrarte." });
      }
    }

    const cleanEmail = email.toLowerCase().trim();
    if (await User.exists({ email: cleanEmail }))
      return res.status(409).json({ message: "Ese email ya está registrado." });

    if (await User.exists({ cedula }))
      return res.status(409).json({ message: "Esa cédula ya está registrada." });

    const passwordHash        = await bcrypt.hash(password, 10);
    const verificationToken   = generateVerificationToken();

    await User.create({
      name:      name.trim(),
      lastName:  lastName.trim(),
      email:     cleanEmail,
      passwordHash,
      cedula,
      phone:     phone.trim(),
      birthDate: birthDate ? new Date(birthDate) : undefined,
      verified:  false,
      verificationToken,
    });

    sendVerificationEmail(cleanEmail, name.trim(), verificationToken)
      .catch(err => console.error("[email] Error enviando verificación:", err.message));

    return res.status(201).json({
      message: "Cuenta creada. Revisá tu correo para activarla.",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// GET /auth/verify/:token
async function verifyEmail(req, res) {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "El enlace de verificación es inválido o ya fue utilizado." });
    }

    user.verified          = true;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({ message: "Cuenta verificada correctamente. Ya podés iniciar sesión." });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// POST /auth/token  (login — paso 1: verifica credenciales y envía OTP)
async function token(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email y password son requeridos." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Credenciales inválidas." });

    if (!user.passwordHash) {
      return res.status(401).json({ message: "Esta cuenta fue creada con Google. Usá el botón de Google para ingresar." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas." });

    if (!user.verified) {
      return res.status(403).json({
        message: "Cuenta pendiente de verificación. Revisá tu correo y hacé clic en el enlace de activación.",
        unverified: true,
      });
    }

    // Generar OTP de 6 dígitos con expiración de 5 minutos
    const otp    = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    user.twoFactorCode   = otp;
    user.twoFactorExpiry = expiry;
    await user.save();

    // Enviar OTP por SMS (no bloqueamos si falla)
    console.log(`[2FA DEV] OTP para ${user.email}: ${otp}`); // quitar en producción
    sendSmsCode(user.phone, otp)
      .catch(err => console.error("[sms] Error enviando OTP:", err.message));

    // Token temporal (5 min) para identificar la sesión 2FA pendiente
    const tempToken = jwt.sign(
      { id: user._id, type: "2fa_pending" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return res.status(200).json({ twoFactor: true, tempToken });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// POST /auth/verify-2fa  (login — paso 2: verifica OTP y emite JWT definitivo)
async function verify2FA(req, res) {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code)
      return res.status(400).json({ message: "tempToken y code son requeridos." });

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Sesión expirada. Volvé a iniciar sesión." });
    }

    if (payload.type !== "2fa_pending")
      return res.status(401).json({ message: "Token inválido." });

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Usuario no encontrado." });

    if (!user.twoFactorCode || !user.twoFactorExpiry)
      return res.status(400).json({ message: "No hay un código 2FA pendiente." });

    if (new Date() > user.twoFactorExpiry)
      return res.status(401).json({ message: "El código expiró. Volvé a iniciar sesión." });

    if (user.twoFactorCode !== code.trim())
      return res.status(401).json({ message: "Código incorrecto." });

    // Limpiar OTP y emitir JWT definitivo
    user.twoFactorCode   = undefined;
    user.twoFactorExpiry = undefined;
    await user.save();

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
    const { credential, pendingToken, cedula } = req.body;

    // ── Segunda llamada: usuario nuevo completa registro con cédula ──────────
    if (pendingToken && cedula) {
      let googleData;
      try {
        googleData = jwt.verify(pendingToken, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ message: "Sesión expirada. Intentá iniciar sesión con Google nuevamente." });
      }

      const { googleId, email, name, lastName } = googleData;

      if (await User.exists({ cedula })) {
        return res.status(409).json({ message: "Esa cédula ya está registrada en otra cuenta." });
      }

      // Google ya verificó el correo → verified: true
      const user = await User.create({ name, lastName, email, googleId, cedula, verified: true });

      const jwtToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );
      return res.status(200).json({ token: jwtToken });
    }

    // ── Primera llamada: verificar token de Google ───────────────────────────
    if (!credential) {
      return res.status(400).json({ message: "Token de Google requerido." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: name, family_name: lastName } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const pt = jwt.sign(
        { googleId, email, name: name || "", lastName: lastName || "" },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );
      return res.status(200).json({ needsCedula: true, pendingToken: pt });
    }

    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    if (!user.verified) {
      user.verified          = true;
      user.verificationToken = undefined;
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

module.exports = { register, token, verify2FA, googleAuth, validateCedula, verifyEmail };
