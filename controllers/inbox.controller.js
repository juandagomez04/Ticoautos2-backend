const Conversation = require("../models/conversation.model");
const Vehicle = require("../models/vehicle.model");
const { containsContactInfo } = require("../services/ai.service");

// POST /api/inbox/:vehicleId/message  →  enviar mensaje (comprador o vendedor)
async function sendMessage(req, res) {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ message: "El mensaje no puede estar vacío." });

        const vehicle = await Vehicle.findById(req.params.vehicleId).populate("owner", "name lastName");
        if (!vehicle) return res.status(404).json({ message: "Vehículo no encontrado." });

        const isOwner = vehicle.owner._id.toString() === req.user.id;

        // El dueño no puede iniciar conversación
        if (isOwner) return res.status(403).json({ message: "No puedes enviar el primer mensaje en tu propio vehículo." });

        let conversation = await Conversation.findOne({ vehicle: vehicle._id, buyer: req.user.id });

        if (!conversation) {
            // Primera vez: crear conversación
            conversation = await Conversation.create({
                vehicle: vehicle._id,
                buyer: req.user.id,
                owner: vehicle.owner._id,
                messages: [],
            });
        }

        // Validar turno: el último mensaje no puede ser del mismo rol
        const lastMsg = conversation.messages[conversation.messages.length - 1];
        const myRole = isOwner ? "owner" : "buyer";

        if (lastMsg && lastMsg.role === myRole) {
            return res.status(409).json({ message: "Debes esperar la respuesta del otro usuario antes de enviar otro mensaje." });
        }

        const hasContactInfo = await containsContactInfo(text.trim());
        if (hasContactInfo) {
            return res.status(400).json({
                message: "Tu mensaje contiene información de contacto personal. Por seguridad, las negociaciones deben realizarse dentro de la plataforma.",
            });
        }

        conversation.messages.push({ sender: req.user.id, role: myRole, text: text.trim() });
        await conversation.save();

        await conversation.populate([
            { path: "buyer", select: "name lastName" },
            { path: "owner", select: "name lastName" },
            { path: "vehicle", select: "brand model year transmission fuel mileage" },
            { path: "messages.sender", select: "name lastName" },
        ]);

        return res.status(201).json(conversation);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

// POST /api/inbox/:vehicleId/reply  →  propietario responde en una conversación
async function replyMessage(req, res) {
    try {
        const { text, buyerId } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ message: "El mensaje no puede estar vacío." });

        const vehicle = await Vehicle.findById(req.params.vehicleId);
        if (!vehicle) return res.status(404).json({ message: "Vehículo no encontrado." });

        if (vehicle.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Solo el propietario puede responder." });
        }

        const conversation = await Conversation.findOne({ vehicle: vehicle._id, buyer: buyerId });
        if (!conversation) return res.status(404).json({ message: "Conversación no encontrada." });

        const lastMsg = conversation.messages[conversation.messages.length - 1];
        if (lastMsg && lastMsg.role === "owner") {
            return res.status(409).json({ message: "Debes esperar la respuesta del comprador antes de enviar otro mensaje." });
        }

        const hasContactInfo = await containsContactInfo(text.trim());
        if (hasContactInfo) {
            return res.status(400).json({
                message: "Tu mensaje contiene información de contacto personal. Por seguridad, las negociaciones deben realizarse dentro de la plataforma.",
            });
        }

        conversation.messages.push({ sender: req.user.id, role: "owner", text: text.trim() });
        await conversation.save();

        await conversation.populate([
            { path: "buyer", select: "name lastName" },
            { path: "owner", select: "name lastName" },
            { path: "vehicle", select: "brand model year transmission fuel mileage" },
            { path: "messages.sender", select: "name lastName" },
        ]);

        return res.status(201).json(conversation);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

// GET /api/inbox/my  →  propietario ve sus conversaciones
async function getMyInbox(req, res) {
    try {
        const conversations = await Conversation.find({ owner: req.user.id })
            .populate("buyer", "name lastName")
            .populate("vehicle", "brand model year transmission fuel mileage")
            .sort({ updatedAt: -1 });

        return res.json(conversations);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

// GET /api/inbox/conversation/:vehicleId/:buyerId  →  detalle de conversación
async function getConversation(req, res) {
    try {
        const { vehicleId, buyerId } = req.params;

        const conversation = await Conversation.findOne({ vehicle: vehicleId, buyer: buyerId })
            .populate("buyer", "name lastName")
            .populate("owner", "name lastName")
            .populate("vehicle", "brand model year transmission fuel mileage owner")
            .populate("messages.sender", "name lastName");

        if (!conversation) return res.status(404).json({ message: "Conversación no encontrada." });

        const isOwner = conversation.owner._id.toString() === req.user.id;
        const isBuyer = conversation.buyer._id.toString() === req.user.id;
        if (!isOwner && !isBuyer) return res.status(403).json({ message: "No autorizado." });

        return res.json(conversation);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

// GET /api/inbox/bought  →  comprador ve sus conversaciones
async function getMyConversations(req, res) {
    try {
        const conversations = await Conversation.find({ buyer: req.user.id })
            .populate("buyer", "name lastName")   // ← esta línea
            .populate("owner", "name lastName")
            .populate("vehicle", "brand model year transmission fuel mileage")
            .sort({ updatedAt: -1 });

        return res.json(conversations);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

module.exports = { sendMessage, replyMessage, getMyInbox, getMyConversations, getConversation };