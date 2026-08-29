import { io } from 'socket.io-client';

// Single shared socket connection to the backend
export const socket = io('http://localhost:5000', {
  autoConnect: true,
});

// Ask the server to put this socket in the relevant rooms
export function registerSocket(userId, requestId) {
  socket.emit('register', { userId, requestId });
}
