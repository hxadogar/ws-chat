import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

// keep track of connected users
// key is the websocket, value is their username
const users = new Map<WebSocket, string>();

wss.on('connection', (ws) => {
  console.log('someone connected');

  ws.on('message', (raw) => {
    const text = raw.toString();
    console.log('got:', text);
  });

  ws.on('close', () => {
    const name = users.get(ws) || 'unknown';
    users.delete(ws);
    console.log(name + ' disconnected');
  });
});

console.log('chat server running on port ' + PORT);
