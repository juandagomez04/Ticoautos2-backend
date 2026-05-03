const { GraphQLError } = require("graphql");
const Vehicle = require("../models/vehicle.model");
const User = require("../models/user.model");
const Conversation = require("../models/conversation.model");

function requireAuth(user) {
  if (!user) {
    throw new GraphQLError("No autenticado. Incluí el token en el header Authorization.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}

const resolvers = {
  Query: {
    
    // ── Públicas ────────────────────────────────────────────────────

    async vehicles(_, { brand, model, minYear, maxYear, minPrice, maxPrice, status }) {
      const filter = {};

      if (brand) filter.brand = { $regex: brand, $options: "i" };
      if (model) filter.model = { $regex: model, $options: "i" };
      if (status) filter.status = status;

      if (minYear || maxYear) {
        filter.year = {};
        if (minYear) filter.year.$gte = minYear;
        if (maxYear) filter.year.$lte = maxYear;
      }

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = minPrice;
        if (maxPrice) filter.price.$lte = maxPrice;
      }

      return Vehicle.find(filter).populate("owner").sort({ createdAt: -1 });
    },

    async vehicle(_, { id }) {
      return Vehicle.findById(id).populate("owner");
    },

    // ── Autenticadas ────────────────────────────────────────────────

    async me(_, __, { user }) {
      requireAuth(user);
      return User.findById(user.id);
    },

    async myVehicles(_, __, { user }) {
      requireAuth(user);
      return Vehicle.find({ owner: user.id }).populate("owner").sort({ createdAt: -1 });
    },

    async myInbox(_, __, { user }) {
      requireAuth(user);
      return Conversation.find({ owner: user.id })
        .populate("vehicle")
        .populate("buyer")
        .populate("owner")
        .populate("messages.sender")
        .sort({ updatedAt: -1 });
    },

    async myConversations(_, __, { user }) {
      requireAuth(user);
      return Conversation.find({ buyer: user.id })
        .populate("vehicle")
        .populate("buyer")
        .populate("owner")
        .populate("messages.sender")
        .sort({ updatedAt: -1 });
    },

    async conversation(_, { vehicleId, buyerId }, { user }) {
      requireAuth(user);

      const conv = await Conversation.findOne({ vehicle: vehicleId, buyer: buyerId })
        .populate("vehicle")
        .populate("buyer")
        .populate("owner")
        .populate("messages.sender");

      if (!conv) return null;

      // Solo el comprador o el dueño pueden ver la conversación
      const isParticipant =
        conv.buyer._id.toString() === user.id ||
        conv.owner._id.toString() === user.id;

      if (!isParticipant) {
        throw new GraphQLError("No autorizado para ver esta conversación.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return conv;
    },
  },

  // ── Resolvers de campos ─────────────────────────────────────────

  Vehicle: {
    id: (v) => v._id.toString(),
    owner: (v) => {
      if (!v.owner) return null;
      return v.owner._id ? v.owner : User.findById(v.owner);
    },
    createdAt: (v) => v.createdAt?.toISOString(),
    updatedAt: (v) => v.updatedAt?.toISOString(),
  },

  User: {
    id: (u) => u._id.toString(),
    createdAt: (u) => u.createdAt?.toISOString(),
  },

  Conversation: {
    id: (c) => c._id.toString(),
    createdAt: (c) => c.createdAt?.toISOString(),
  },

  Message: {
    id: (m) => m._id.toString(),
    sender: (m) => (m.sender._id ? m.sender : User.findById(m.sender)),
    createdAt: (m) => m.createdAt?.toISOString(),
  },
};

module.exports = resolvers;
