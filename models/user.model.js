const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    lastName:          { type: String, required: true, trim: true },
    email:             { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash:      { type: String, required: false },
    googleId:          { type: String, required: false, unique: true, sparse: true },
    cedula:            { type: String, required: false, unique: true, sparse: true },
    birthDate:         { type: Date,   required: false },
    phone:             { type: String, required: false, trim: true },

    // Verificación de correo
    verified:          { type: Boolean, default: false },
    verificationToken: { type: String,  required: false },

    // 2FA por SMS
    twoFactorCode:     { type: String,  required: false },
    twoFactorExpiry:   { type: Date,    required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
