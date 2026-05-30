# 🚖 DriveSync — Real-Time Driver Booking Platform

## Overview

DriveSync is a full-stack real-time driver booking platform designed for users who prefer traveling in their own vehicles while hiring professional drivers on demand.

The platform focuses on:

* Real-time ride coordination
* Driver verification workflows
* Secure authentication systems
* Deterministic fare calculation
* Scalable backend architecture

Built with a frontend-backend separated architecture using Node.js, Express.js, MongoDB, and Socket.io.

---

# 🌐 Live Deployment

## Frontend

[https://drive-sync-pi.vercel.app](https://drive-sync-pi.vercel.app)

## Backend API

[https://drivesync-production.up.railway.app/api/health](https://drivesync-production.up.railway.app/api/health)

---

# ✨ Core Features

* Real-time driver booking system
* Socket.io powered live communication
* JWT authentication system
* Role-Based Access Control (RBAC)
* Driver availability management
* Ride status tracking
* Admin verification workflows
* Revenue analytics dashboard
* MongoDB database integration
* Event-driven backend workflows

---

# 🧠 Technical Highlights

## Real-Time Event System

DriveSync uses Socket.io to establish live communication between users, drivers, and the backend server.

Instead of relying on polling, the backend pushes booking events directly to active drivers using socket-based event handling.

---

## Authentication & Security

* JWT-based stateless authentication
* Role-based authorization middleware
* Protected admin routes
* Secure backend request validation

---

## Fare Calculation Engine

DriveSync uses a deterministic fare engine:

```text
Total Fare = Base Fee + (Distance × Rate) + Service Tax
```

The system minimizes GPS inconsistencies by applying controlled distance rounding.

---

# 🏗️ Tech Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.io
* JWT Authentication

## Deployment

* Vercel
* Railway
* MongoDB Atlas

---

# 📂 Project Structure

```text
DriveSync/
│
├── frontend/
│   └── index.html
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── docs/
├── README.md
└── .gitignore
```

---

# ⚙️ Local Setup

## 1. Clone Repository

```bash
git clone https://github.com/SakethReddyE/DriveSync.git
```

---

## 2. Navigate to Backend

```bash
cd backend
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
PORT=5000
```

---

## 5. Seed Database

```bash
node seed.js
```

---

## 6. Start Backend Server

```bash
npm start
```

---

## 7. Launch Frontend

Open `frontend/index.html` using:

* VS Code Live Server
  OR
* any static server

---

# 📊 Admin Features

* Driver verification queue
* Ride monitoring
* Revenue analytics dashboard
* Driver status management
* Platform operational oversight

---

# 🔮 Future Roadmap

* Google Maps API integration
* Live route tracking
* Razorpay/Stripe payments
* Progressive Web App (PWA)
* Advanced analytics
* Driver performance scoring

---

# 📌 Engineering Concepts Explored

* Event-driven systems
* WebSocket communication
* Real-time synchronization
* Middleware architecture
* Authentication workflows
* Backend modularization
* Database schema design
* Stateful ride lifecycle management

---

# 👨‍💻 Developer

## Saketh Reddy

Aspiring AI Product Engineer | Backend Systems & Full-Stack Developer

Focused on:

* Real-time systems
* AI-native applications
* Backend engineering
* Scalable software systems
* Intelligent automation workflows
