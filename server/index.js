import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'https://cricfever.vercel.app',
  ];

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);

app.get('/health', (_req, res) => {
  const stats = roomManager.getStats();
  res.json({ status: 'ok', ...stats });
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on('create_room', (data, ack) => {
    const result = roomManager.createRoom(socket, data);
    if (ack) ack(result);
  });

  socket.on('join_room', (data, ack) => {
    const result = roomManager.joinRoom(socket, data);
    if (ack) ack(result);
  });

  socket.on('player_ready', () => {
    roomManager.setPlayerReady(socket);
  });

  socket.on('toss_choice', (data) => {
    roomManager.handleTossChoice(socket, data);
  });

  socket.on('bowl_input', (data) => {
    roomManager.handleBowlInput(socket, data);
  });

  socket.on('shot_input', (data) => {
    roomManager.handleShotInput(socket, data);
  });

  socket.on('ball_result_from_client', (data) => {
    roomManager.handleBallResultFromClient(socket, data);
  });

  socket.on('leave_room', () => {
    roomManager.leaveRoom(socket);
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    roomManager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Cricket Fever server running on port ${PORT}`);
});
