# DriveSync — Complete Technical Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [How to Run](#4-how-to-run)
5. [Architecture](#5-architecture)
6. [Database Models](#6-database-models)
7. [API Reference](#7-api-reference)
8. [Authentication System](#8-authentication-system)
9. [Real-Time System (Socket.io)](#9-real-time-system-socketio)
10. [Frontend Architecture](#10-frontend-architecture)
11. [User Roles & Flows](#11-user-roles--flows)
12. [Fare Calculation](#12-fare-calculation)
13. [Environment Variables](#13-environment-variables)
14. [Default Credentials](#14-default-credentials)

---

## 1. Project Overview

DriveSync is a personal driver hiring platform for Hyderabad. Users hire a verified driver for their **own vehicle** — not a cab service. The platform has three roles: **User** (rider), **Driver**, and **Admin**.

**Core features:**
- User signup/login and ride booking
- Driver application, admin approval, and ride acceptance
- Real-time notifications via Socket.io (no polling needed)
- Admin dashboard with analytics charts
- Dark mode, location autocomplete, driver profiles
- Feedback system for both users and drivers

---

## 2. Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | v18+ | Runtime |
| Express.js | 4.19 | HTTP server & routing |
| MongoDB | Local / Atlas | Database |
| Mongoose | 8.4 | ODM (Object Document Mapper) |
| Socket.io | 4.8 | Real-time bidirectional events |
| bcryptjs | 2.4 | Password hashing (salt rounds: 12) |
| jsonwebtoken | 9.0 | JWT auth tokens (7-day expiry) |
| express-validator | 7.1 | Input validation & sanitization |
| dotenv | 16.4 | Environment variable management |
| cors | 2.8 | Cross-Origin Resource Sharing |
| nodemon | 3.1 | Dev auto-restart (devDependency) |

### Frontend
| Technology | Purpose |
|---|---|
| Vanilla HTML/CSS/JS | Single-file SPA (no framework) |
| Chart.js 4.4 (CDN) | Admin analytics bar/line charts |
| Socket.io client (CDN) | Real-time event listener |
| Google Fonts — Inter | Typography |
| CSS Custom Properties | Theming (light/dark mode) |
| Fetch API | All HTTP calls to backend |
| localStorage | JWT token + session storage |

---

## 3. Project Structure

```
DriveSync/
├── drivesync_full_app.html     ← Entire frontend (HTML + CSS + JS)
│
└── backend/
    ├── server.js               ← Entry point
    ├── package.json
    ├── .env                    ← Secrets (never commit this)
    ├── seed.js                 ← One-time DB seeder for sample drivers
    │
    ├── config/
    │   └── db.js               ← MongoDB connection
    │
    ├── models/
    │   ├── User.js             ← Customer schema
    │   ├── Driver.js           ← Driver schema
    │   └── Ride.js             ← Booking schema
    │
    ├── controllers/
    │   ├── authController.js   ← signup, login, getMe
    │   ├── driverController.js ← apply, available, profile, toggleOnline
    │   ├── rideController.js   ← fare, book, accept, reject, cancel, rate, charts
    │   └── adminController.js  ← stats, driver management, users, rides
    │
    ├── routes/
    │   ├── authRoutes.js
    │   ├── driverRoutes.js
    │   ├── rideRoutes.js
    │   └── adminRoutes.js
    │
    ├── middleware/
    │   ├── auth.js             ← JWT protect + requireRole
    │   └── errorHandler.js     ← Global error handler
    │
    └── socket.js               ← Socket.io connection registry
```

---

## 4. How to Run

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017 (or Atlas URI)

### Steps

```bash
# 1. Go into the backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Seed the 4 sample drivers into MongoDB (run once)
node seed.js

# 4. Start the server (with auto-restart)
npm run dev

# OR start without auto-restart
npm start
```

Server starts at: `http://localhost:5000`

Health check: `http://localhost:5000/api/health`

### Frontend
Open `drivesync_full_app.html` via **VS Code Live Server** (port 5500).
The frontend is pre-configured to call `http://localhost:5000/api`.

---

## 5. Architecture

```
Browser (drivesync_full_app.html)
        │
        │  HTTP REST (fetch API)
        │  WebSocket (Socket.io)
        ▼
Express Server (server.js : port 5000)
        │
        ├── /api/auth      → authRoutes    → authController
        ├── /api/drivers   → driverRoutes  → driverController
        ├── /api/rides     → rideRoutes    → rideController
        └── /api/admin     → adminRoutes   → adminController
                │
                ▼
        Mongoose ODM
                │
                ▼
        MongoDB (drivesync database)
        Collections: users, drivers, rides
```

### Request lifecycle
1. Browser calls `apiFetch('/rides/book', { method: 'POST', ... })`
2. `apiFetch` attaches `Authorization: Bearer <token>` header automatically
3. Express routes the request to the correct controller
4. `protect` middleware verifies the JWT and attaches `req.user`
5. `requireRole` middleware checks the user has the right role
6. Controller runs business logic, queries MongoDB via Mongoose
7. Controller sends JSON response `{ success: true, ... }`
8. If a real-time event is needed, `emitToDriver()` or `emitToUser()` fires a Socket.io event
9. Frontend receives the response and updates the DOM

---

## 6. Database Models

### User
Represents a customer (rider).

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, min 2 chars |
| `email` | String | Unique, lowercase |
| `phone` | String | Required |
| `password` | String | Bcrypt hashed, `select: false` |
| `role` | String | `'user'` or `'admin'` |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

Password is **never returned** in queries (`select: false`). The `matchPassword()` instance method uses `bcrypt.compare()` to verify.

---

### Driver
Represents a driver. Goes through an approval workflow.

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `age` | Number | 18–70 |
| `phone` | String | Required |
| `email` | String | Unique |
| `password` | String | Bcrypt hashed, `select: false` |
| `licence` | String | Driving licence number |
| `experience` | String | Enum: `'Less than 1 year'`, `'1–3 years'`, `'3–5 years'`, `'5–10 years'`, `'10+ years'` |
| `location` | String | Area in Hyderabad |
| `pastExperience` | String | Free text |
| `status` | String | `'pending'` → `'approved'` or `'rejected'` |
| `online` | Boolean | Whether driver is accepting rides |
| `rating` | Number | Cached average (0–5), updated on each rating |
| `totalRides` | Number | Incremented on ride acceptance |
| `color` | String | Hex color for avatar (cycles through 6 colors) |

**Status workflow:**
```
Apply → pending → (Admin approves) → approved → can go online
                → (Admin rejects)  → deleted from DB
```

---

### Ride
Represents a single booking between a user and a driver.

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | Ref: User |
| `driver` | ObjectId | Ref: Driver |
| `pickup` | String | Pickup location text |
| `drop` | String | Drop location text |
| `distanceKm` | Number | Deterministic hash-based estimate |
| `fare.base` | Number | ₹40 flat |
| `fare.distance` | Number | km × ₹6 |
| `fare.serviceFee` | Number | 5% of (base + distance) |
| `fare.total` | Number | Sum of all fare components |
| `status` | String | `pending` → `confirmed` / `rejected` / `cancelled` / `completed` |
| `rated` | Boolean | Whether user has submitted feedback |
| `driverRating` | Number | 1–5, from user |
| `serviceRating` | Number | 1–5, from user |
| `feedbackComment` | String | User's text comment |
| `driverFeedback.rating` | Number | Driver's internal rating of rider |
| `driverFeedback.note` | String | Driver's internal note |

**Ride status lifecycle:**
```
book → pending → (driver accepts) → confirmed → (user rates) → completed
               → (driver rejects) → rejected
               → (user cancels)   → cancelled
```

---

## 7. API Reference

All endpoints return `{ success: true/false, ... }`.
Protected routes require `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signup` | None | Register new user. Body: `{ name, email, phone, password }` |
| POST | `/login` | None | Login for user/driver/admin. Body: `{ email, password }`. Returns `{ token, role, user }` |
| GET | `/me` | JWT | Get current user's profile |

**Login logic:** The single `/login` endpoint checks in order: admin credentials (from `.env`), then Driver collection, then User collection. Returns the appropriate role so the frontend can route to the correct dashboard.

---

### Drivers — `/api/drivers`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/available` | None | All approved + online drivers (for booking page) |
| POST | `/apply` | User JWT | Submit driver application |
| GET | `/me` | Driver JWT | Driver's own profile + full ride history + total income |
| PATCH | `/toggle-online` | Driver JWT | Flip online/offline status |

---

### Rides — `/api/rides`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/fare` | None | Calculate fare for pickup/drop pair (deterministic) |
| POST | `/book` | User JWT | Create a pending ride request |
| GET | `/my` | User JWT | User's ride history + totalSpent + avgRating |
| GET | `/pending-for-driver` | Driver JWT | Pending ride requests for this driver |
| GET | `/chart-data` | Admin JWT | Last 7 days rides + revenue (for charts) |
| PATCH | `/:id/accept` | Driver JWT | Accept a pending ride |
| PATCH | `/:id/reject` | Driver JWT | Reject a pending ride |
| PATCH | `/:id/cancel` | User JWT | Cancel a pending or confirmed ride |
| PATCH | `/:id/driver-feedback` | Driver JWT | Driver leaves internal note about rider |
| POST | `/:id/rate` | User JWT | User rates driver + service (1–5 stars each) |

---

### Admin — `/api/admin`
All admin routes require Admin JWT.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/stats` | Total users, active drivers, pending drivers, total rides |
| GET | `/drivers/pending` | All pending driver applications |
| GET | `/drivers/active` | All approved drivers |
| PATCH | `/drivers/:id/approve` | Approve a driver application |
| PATCH | `/drivers/:id/reject` | Reject + delete a driver application |
| DELETE | `/drivers/:id` | Remove an approved driver |
| GET | `/users` | All registered users |
| GET | `/rides` | All rides (populated with user + driver names) |

---

## 8. Authentication System

### How it works

1. **Signup/Login** → server returns a signed JWT
2. Frontend stores JWT in `localStorage` under key `ds_token`
3. Frontend also stores a session object in `localStorage` under `ds_session` — contains `{ role, name, email, id }` for quick UI rendering without an API call
4. Every `apiFetch()` call automatically attaches `Authorization: Bearer <token>`
5. `protect` middleware on the server verifies the token using `JWT_SECRET`
6. `requireRole('user')` / `requireRole('driver')` / `requireRole('admin')` restricts access

### JWT payload structure

```js
// User token
{ id: "mongo_object_id", role: "user" }

// Driver token
{ id: "mongo_object_id", role: "driver" }  // or "driver-pending"

// Admin token
{ id: "admin", role: "admin", email: "admin@drivesync.in" }
```

### Token expiry
7 days (configurable via `JWT_EXPIRES_IN` in `.env`).

### Password hashing
bcrypt with **12 salt rounds**. Passwords are hashed in a Mongoose `pre('save')` hook — plain text never reaches the database.

### Navigation guards (frontend)
`goPage()` checks the session role before rendering any page:
- `driver-pending` role → can only see home, auth, and driver-pending pages
- Unauthenticated → redirected to login if trying to access book/dashboard/admin

---

## 9. Real-Time System (Socket.io)

### How it works

The server maintains two in-memory Maps:
```js
userSockets:   Map<userId   → socket.id>
driverSockets: Map<driverId → socket.id>
```

When a client connects, it immediately emits a `register` event:
```js
socket.emit('register', { role: 'user', id: 'mongo_id' })
```

The server stores the mapping so it can push events to specific clients.

### Events

| Event | Direction | Trigger | Payload |
|---|---|---|---|
| `new_ride_request` | Server → Driver | User books a ride | `{ rideId, pickup, drop, distanceKm, fare, user }` |
| `ride_accepted` | Server → User | Driver accepts | `{ rideId }` |
| `ride_rejected` | Server → User | Driver rejects | `{ rideId }` |
| `ride_cancelled` | Server → Driver | User cancels | `{ rideId }` |

### Fallback polling
If the socket connection drops, the frontend falls back to polling `/api/rides/my` every 5 seconds to check ride status. This ensures the confirmation screen always updates even without a live socket.

---

## 10. Frontend Architecture

The entire frontend is a **single HTML file** (`drivesync_full_app.html`) — no build tools, no framework, no bundler.

### Page routing
All 12 pages are `<div class="page">` elements. Only one has `class="page active"` at a time. `goPage(name)` switches the active class:

```
pg-home          → Landing page
pg-auth          → Login / Signup
pg-book          → Book a driver
pg-confirmed     → Booking confirmation + status polling
pg-become        → Driver application form
pg-driver-pending → Application submitted screen
pg-user-dash     → User ride history
pg-driver-dash   → Driver dashboard (toggle, pending requests, history)
pg-admin         → Admin panel (stats, charts, tables)
pg-driver-profile → Public driver profile
pg-tracking      → Animated ride tracking (simulated)
pg-feedback      → User rates driver after ride
```

### State management
All state lives in plain JS variables:
```js
afterAuth     // where to redirect after login
selDriver     // currently selected driver object
fareData      // calculated fare breakdown
currentRideId // ride being rated or cancelled
dStar, sStar  // star rating values
```

### API layer
`apiFetch(path, options)` is the single wrapper for all HTTP calls:
- Automatically attaches the JWT from localStorage
- Throws an `Error` with the server's message if `res.ok` is false
- All callers use `try/catch` and show errors via `toast()`

### Auth helpers (`Auth` object)
```js
Auth.getToken()      // read JWT from localStorage
Auth.setToken(t)     // save JWT
Auth.clearToken()    // remove JWT + session (logout)
Auth.getSession()    // read parsed session object
Auth.setSession(s)   // save session object
```

### Dark mode
CSS custom properties (`--bg`, `--text`, etc.) are redefined under `body.dark { }`. Toggling adds/removes the `dark` class on `<body>`. Preference is saved to `localStorage` as `'1'` or `'0'`.

### Location autocomplete
30 Hyderabad locations are hardcoded in `HYD_LOCATIONS` array. Typing in the pickup/drop fields filters this list in real time. Selecting a location auto-triggers fare calculation if both fields are filled.

### Admin charts (Chart.js)
Two charts on the admin dashboard:
- **Bar chart** — rides per day for the last 7 days
- **Line chart** — revenue (₹) per day for the last 7 days

Data comes from `GET /api/rides/chart-data`. Charts are destroyed and re-created when dark mode is toggled to apply the correct grid/text colors.

---

## 11. User Roles & Flows

### User (Rider) flow
```
Sign Up → Login → Book a Driver
  → Enter pickup + drop → Calculate Fare (deterministic)
  → Select driver → View Profile (optional)
  → Confirm Booking → Ride created as "pending"
  → Wait for driver to accept (real-time via socket)
  → Confirmed → Go to My Rides → Rate the ride
```

### Driver flow
```
Sign Up (as user) → Apply as Driver (form)
  → Status: pending → Admin approves
  → Login → Driver Dashboard
  → Toggle Online → Incoming ride requests appear in real-time
  → Accept or Decline each request
  → Accepted rides appear in Ride History
  → Leave internal note about rider (optional)
```

### Admin flow
```
Login (admin@drivesync.in / Admin@123)
  → Admin Dashboard
  → View stats + charts
  → Driver Requests tab → Approve or Reject applications
  → Active Drivers tab → Remove drivers
  → Users tab → View all registered users
  → All Rides tab → View complete ride history
```

---

## 12. Fare Calculation

Fare is calculated server-side at `POST /api/rides/fare`.

### Formula
```
km       = deterministic_hash(pickup + '|' + drop) mapped to 4–19 range
base     = ₹40  (flat)
distance = km × ₹6
service  = round((base + distance) × 5%)
total    = base + distance + service
```

### Why deterministic?
A simple polynomial hash of the combined pickup+drop string is used instead of `Math.random()`. This means:
- Same locations → same fare every time
- Different locations → different fare
- Clicking "Calculate Fare" multiple times doesn't change the price
- Order matters: A→B gives a different fare than B→A (realistic)

### Example
```
Kukatpally → Hitech City  →  ~11 km  →  ₹40 + ₹66 + ₹5 = ₹111
Banjara Hills → Gachibowli →  ~8 km  →  ₹40 + ₹48 + ₹4 = ₹92
```

---

## 13. Environment Variables

File: `backend/.env`

```env
MONGO_URI=mongodb://127.0.0.1:27017/drivesync
JWT_SECRET=drivesync_super_secret_jwt_key_change_in_prod
JWT_EXPIRES_IN=7d
PORT=5000
ADMIN_EMAIL=admin@drivesync.in
ADMIN_PASSWORD=Admin@123
CLIENT_ORIGIN=http://127.0.0.1:5500
```

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string. Change to Atlas URI for production |
| `JWT_SECRET` | Secret key for signing JWTs. Use a long random string in production |
| `JWT_EXPIRES_IN` | Token lifetime. Default 7 days |
| `PORT` | Server port. Default 5000 |
| `ADMIN_EMAIL` | Admin login email (not stored in DB) |
| `ADMIN_PASSWORD` | Admin login password (not stored in DB, plain text in env) |
| `CLIENT_ORIGIN` | Allowed CORS origin. Set to your frontend URL |

---

## 14. Default Credentials

### Admin
```
Email:    admin@drivesync.in
Password: Admin@123
```

### Sample Drivers (seeded by `node seed.js`)
```
Ramesh Kumar   →  ramesh@drv.in   /  Drv@1234  (Online,  4.9★, Kukatpally)
Suresh Babu    →  suresh@drv.in   /  Drv@1234  (Online,  4.7★, Madhapur)
Pradeep Varma  →  pradeep@drv.in  /  Drv@1234  (Online,  4.8★, Hitech City)
Mohammed Irfan →  irfan@drv.in    /  Drv@1234  (Offline, 4.6★, Banjara Hills)
```

### Test User
Register any new account via the Sign Up form.

---

*DriveSync — Hyderabad's Personal Driver Service*
