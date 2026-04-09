const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: false }, // opcional para usuarios de Google
    googleId: { type: String, required: false, unique: true, sparse: true }, // sparse permite múltiples null
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);