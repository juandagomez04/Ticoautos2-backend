const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const jwt      = require("jsonwebtoken");
require("dotenv").config();

const { createHandler }       = require("graphql-http/lib/use/express");
const { makeExecutableSchema } = require("@graphql-tools/schema");

const typeDefs  = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const authRoutes    = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const inboxRoutes   = require("./routes/inbox.routes");

const schema = makeExecutableSchema({ typeDefs, resolvers });

async function start() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ── REST ──────────────────────────────────────────────────────────
  app.use("/auth",         authRoutes);
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/inbox",    inboxRoutes);

  app.get("/", (req, res) => res.send("REST API funcionando 🚀"));

  // ── GraphQL ───────────────────────────────────────────────────────
  app.all(
    "/graphql",
    createHandler({
      schema,
      context: (req) => {
        const authHeader = req.headers["authorization"] ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

        if (token) {
          try {
            const user = jwt.verify(token, process.env.JWT_SECRET);
            return { user };
          } catch {
            // Token inválido → queries protegidas lanzarán error
          }
        }

        return { user: null };
      },
    })
  );

  // ── GraphiQL (interfaz web)─────────────────────────
  app.get("/graphiql", (_req, res) => {
    res.type("html");
    res.send(`<!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <title>TicoAutos GraphQL</title>
                <link rel="stylesheet" href="https://unpkg.com/graphiql@3.8.3/graphiql.min.css" />
              </head>
              <body style="margin:0">
                <div id="graphiql" style="height:100vh"></div>
                <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
                <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
                <script src="https://unpkg.com/graphiql@3.8.3/graphiql.min.js"></script>
                <script>
                  function fetcher(params) {
                    const token = localStorage.getItem("ticoautos_token") || "";
                    return fetch("http://localhost:3001/graphql", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": "Bearer " + token } : {}),
                      },
                      body: JSON.stringify(params),
                    }).then(function(r) { return r.json(); });
                  }

                  const root = ReactDOM.createRoot(document.getElementById("graphiql"));
                  root.render(React.createElement(GraphiQL, { fetcher: fetcher }));
                </script>
              </body>
              </html>`);
  });

  // ── MongoDB ───────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB conectado ✅");

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`REST     → http://localhost:${PORT}/`);
    console.log(`GraphQL  → http://localhost:${PORT}/graphql`);
    console.log(`GraphiQL → http://localhost:${PORT}/graphiql`);
  });
}

start().catch((err) => {
  console.error("Error al iniciar el servidor:", err);
  process.exit(1);
});
