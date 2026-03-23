const { io } = require('socket.io-client');
const API = process.env.API || 'http://localhost:4000';
const token = process.env.JWT || '';
const sessionId = process.env.WB_SESSION || 'demo';

const socket = io(`${API}/whiteboard`, { auth: { token }, transports: ['websocket'] });

socket.on('connect', () => {
  console.log('connected');
  socket.emit('join', { sessionId });
  let sent = 0;
  const timer = setInterval(() => {
    sent += 1;
    socket.emit('action', { sessionId, payload: { n: sent } });
    if (sent > 25) {
      clearInterval(timer);
      setTimeout(() => process.exit(0), 500);
    }
  }, 50); // ~20 msg/sn
});

socket.on('forbidden', (m) => console.log('forbidden', m));
socket.on('disconnect', (r) => console.log('disc', r));
