const { gql } = require("graphql-tag");

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    lastName: String!
    email: String!
    cedula: String
    phone: String
    createdAt: String
  }

  type Vehicle {
    id: ID!
    brand: String!
    model: String!
    year: Int!
    price: Float!
    status: String!
    transmission: String!
    fuel: String!
    mileage: Int!
    color: String!
    location: String!
    description: String!
    images: [String]
    owner: User
    createdAt: String
    updatedAt: String
  }

  type Message {
    id: ID!
    sender: User!
    role: String!
    text: String!
    createdAt: String
  }

  type Conversation {
    id: ID!
    vehicle: Vehicle!
    buyer: User!
    owner: User!
    messages: [Message!]!
    createdAt: String
  }

  type Query {
    # ── Públicas ────────────────────────────────────────────────────
    vehicles(
      brand: String
      model: String
      minYear: Int
      maxYear: Int
      minPrice: Float
      maxPrice: Float
      status: String
    ): [Vehicle!]!

    vehicle(id: ID!): Vehicle

    # ── Autenticadas ────────────────────────────────────────────────
    me: User

    myVehicles: [Vehicle!]!

    myInbox: [Conversation!]!

    myConversations: [Conversation!]!

    conversation(vehicleId: ID!, buyerId: ID!): Conversation
  }
`;

module.exports = typeDefs;
