import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import app from "./app";
import { connectDB } from "./config/db";

import { createUsersTable } from "./models/User";
import { createLogsTable } from "./models/Log";
import { createSallesTable } from "./models/Salle";

const PORT = process.env.PORT || 3000;

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io accessible to routes and controllers
export { io };

/* ===============================
   SOCKET.IO CONNECTION HANDLER
================================= */
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Join room-specific room (for filtering logs by salle)
  socket.on("join_room", (salle_id: number) => {
    socket.join(`room_${salle_id}`);
    console.log(`Socket ${socket.id} joined room: room_${salle_id}`);
  });

  socket.on("leave_room", (salle_id: number) => {
    socket.leave(`room_${salle_id}`);
    console.log(`Socket ${socket.id} left room: room_${salle_id}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

/* ===============================
   START SERVER
================================= */
const startServer = async () => {
  try {
    // Connect PostgreSQL
    await connectDB();

    // Create tables automatically
    await createUsersTable();
    await createSallesTable();
    await createLogsTable();

    console.log("✅ Tables initialized.");

    // Start server with Socket.io
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.io ready for real-time connections`);
    });

  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

/* ===============================
   RUN ONLY OUTSIDE TEST MODE
================================= */
if (process.env.NODE_ENV !== "test") {
  startServer();
}