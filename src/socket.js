import { io } from 'socket.io-client';

// Fallback to Render backend URL if environment variable is missing
const rawUrl = import.meta.env.VITE_SOCKET_URL || 'https://smart-2-rzwd.onrender.com';
const SOCKET_URL = rawUrl.replace(/\/$/, '');

// Single shared socket connection to the backend
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// Ask the server to put this socket in the relevant rooms
export function registerSocket(userId, requestId) {
  socket.emit('register', { userId, requestId });
}
