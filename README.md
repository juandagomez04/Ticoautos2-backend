# TicoAutos — Backend
🚗 Web API REST + GraphQL para la plataforma de compra y venta de vehículos TicoAutos.

Desarrollado como proyecto académico para la carrera de Ingeniería del Software en la Universidad Técnica Nacional (UTN), Costa Rica.

---

## 📌 Descripción

Este repositorio contiene el backend de TicoAutos. Expone una API REST y una API GraphQL para autenticación de usuarios, gestión de vehículos y sistema de mensajería entre compradores y vendedores. Incluye integración con servicios externos: verificación de cédula costarricense (Padrón Electoral), autenticación con Google OAuth, verificación de correo, autenticación de dos factores (2FA), moderación de mensajes con IA y notificaciones por email y SMS.

---

## ⚙️ Tecnologías

- Node.js + Express 5
- MongoDB (Mongoose)
- JWT (jsonwebtoken)
- bcryptjs
- dotenv / nodemon
- graphql + graphql-http + @graphql-tools/schema
- google-auth-library (OAuth 2.0)
- openai (moderación de mensajes con GPT-4o-mini)
- nodemailer (envío de correos)
- twilio (envío de SMS)

---

## 📂 Estructura del proyecto

```
ticoautos-backend/
 ├── controllers/
 │   ├── auth.controller.js       registro, login, OAuth, 2FA, verificación
 │   ├── vehicle.controller.js    CRUD de vehículos
 │   └── inbox.controller.js      mensajería con moderación IA
 ├── graphql/
 │   ├── typeDefs.js              schema GraphQL (tipos y queries)
 │   └── resolvers.js             resolvers de queries
 ├── middleware/
 │   └── auth.middleware.js       verificación de JWT
 ├── models/
 │   ├── user.model.js            esquema de usuario
 │   ├── vehicle.model.js         esquema de vehículo
 │   └── conversation.model.js    esquema de conversación
 ├── routes/
 │   ├── auth.routes.js
 │   ├── vehicle.routes.js
 │   └── inbox.routes.js
 ├── services/
 │   ├── ai.service.js            moderación de contenido con OpenAI
 │   ├── email.service.js         envío de emails con Nodemailer
 │   └── sms.service.js           envío de SMS con Twilio
 ├── server.js                    punto de entrada
 ├── .env                         variables de entorno (no en git)
 └── package.json
```

---

## 🚀 Instalación y ejecución

```bash
git clone https://github.com/juandagomez04/Ticoautos-backend.git
cd ticoautos-backend
npm install
```

Crear archivo `.env` en la raíz:
```
# Base de datos
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/ticoautos

# Autenticación
JWT_SECRET=tu_clave_secreta
PORT=3001

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id

# OpenAI (moderación de mensajes)
OPENAI_API_KEY=tu_openai_api_key

# Nodemailer (verificación de correo)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_app_password

# Twilio (SMS para 2FA)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE=+1XXXXXXXXXX

# Padrón Electoral
PADRON_SERVICE_URL=http://localhost:3002
```

Ejecutar en modo desarrollo:
```bash
npm run dev
```

El servidor corre en: `http://localhost:3001`

> El microservicio **padron-service** debe estar corriendo en `http://localhost:3002` para que la validación de cédula funcione.

---

## 📡 Endpoints REST

**Base URL:** `http://localhost:3001`

### /auth
| Método | Endpoint | Descripción | JWT |
|--------|----------|-------------|-----|
| POST | /auth/register | Registro de usuario | No |
| POST | /auth/token | Login — retorna JWT | No |
| POST | /auth/verify-2fa | Verificar código 2FA | No |
| POST | /auth/google | Login con Google OAuth | No |
| GET | /auth/cedula/:numero | Validar cédula costarricense | No |
| GET | /auth/verify/:token | Verificar email de registro | No |
| GET | /auth/me | Verificar token activo | ✅ |

### /api/vehicles
| Método | Endpoint | Descripción | JWT |
|--------|----------|-------------|-----|
| GET | /api/vehicles | Listar con filtros y paginación | No |
| GET | /api/vehicles/:id | Ver detalle de vehículo | No |
| GET | /api/vehicles/my | Mis vehículos publicados | ✅ |
| POST | /api/vehicles | Publicar vehículo | ✅ |
| PUT | /api/vehicles/:id | Editar vehículo | ✅ |
| DELETE | /api/vehicles/:id | Eliminar vehículo | ✅ |
| PATCH | /api/vehicles/:id/status | Cambiar estado | ✅ |
| PATCH | /api/vehicles/:id/reserve | Reservar / cancelar reserva | ✅ |

### /api/inbox
| Método | Endpoint | Descripción | JWT |
|--------|----------|-------------|-----|
| GET | /api/inbox/my | Conversaciones como propietario | ✅ |
| GET | /api/inbox/bought | Conversaciones como comprador | ✅ |
| GET | /api/inbox/conversation/:v/:b | Detalle de conversación | ✅ |
| POST | /api/inbox/:vehicleId/message | Enviar mensaje (comprador) | ✅ |
| POST | /api/inbox/:vehicleId/reply | Responder (propietario) | ✅ |

---

## 🔷 API GraphQL

**Endpoint:** `POST http://localhost:3001/graphql`  
**UI interactiva:** `GET http://localhost:3001/graphiql`

El header `Authorization: Bearer <token>` es opcional; las queries autenticadas lo requieren.

### Queries disponibles

| Query | Auth | Descripción |
|-------|------|-------------|
| `vehicles(brand, model, minYear, maxYear, minPrice, maxPrice, status)` | No | Lista vehículos con filtros |
| `vehicle(id)` | No | Detalle de un vehículo |
| `me` | ✅ | Perfil del usuario autenticado |
| `myVehicles` | ✅ | Vehículos publicados por el usuario |
| `myInbox` | ✅ | Conversaciones como propietario |
| `myConversations` | ✅ | Conversaciones como comprador |
| `conversation(vehicleId, buyerId)` | ✅ | Conversación específica (solo participantes) |

---

## 🗂️ Modelo de entidades

### User
`name`, `lastName`, `email` (único), `cedula`, `phone`, `passwordHash`, `createdAt`

### Vehicle
`brand`, `model`, `year`, `price`, `status` (disponible/reservado/vendido), `transmission`, `fuel`, `mileage`, `color`, `location`, `description`, `images[]`, `owner` (ref User), `reservedBy` (ref User)

### Conversation
`vehicle` (ref Vehicle), `buyer` (ref User), `owner` (ref User), `messages[]`
- messages: `{ sender, role (buyer/owner), text, createdAt }`

---

## 🔐 Seguridad

- Contraseñas encriptadas con bcryptjs (salt: 10).
- Autenticación con JWT — expiración de 2 horas.
- Google OAuth 2.0 como método alternativo de autenticación.
- Verificación de email al registrarse.
- Autenticación de dos factores (2FA) vía SMS con Twilio.
- Rutas protegidas verifican propiedad del recurso antes de modificar.
- Mensajes de inbox moderados por IA (GPT-4o-mini) para detectar información de contacto.
- `.env` excluido del repositorio.
- Límite de payload de 10mb para imágenes en base64.

---

## 👨‍💻 Autor

**Juan Daniel Gómez Cubillo**
Ingeniería del Software — UTN Costa Rica
Curso: Programación en Ambiente Web II (ISW-711)
