import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  throw new Error('VITE_SOCKET_URL is required');
}

// Single shared socket connection to the backend
export const socket = io(SOCKET_URL, {
  autoConnect: true,
});

// Ask the server to put this socket in the relevant rooms
export function registerSocket(userId, requestId) {
  socket.emit('register', { userId, requestId });
}