import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { socketHandler } from './socket/socketHandler.js';
import logger from './utils/logger.js';

// Configure environment variable loaders
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

const server = http.createServer(app);

// Bind WebSockets (Socket.io) to server instance
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Configure Socket.io signals logic
socketHandler(io);

// Start listening for traffic
server.listen(PORT, () => {
  logger.info(`Nexus Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
export { server };
