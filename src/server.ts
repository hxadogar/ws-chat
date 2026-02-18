import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 3000;

// serve the html file
const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('cant read html file');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

const wss = new WebSocketServer({ server: httpServer });

const rooms = new Map<string, Set<WebSocket>>();
const names = new Map<WebSocket, string>();
const currentRoom = new Map<WebSocket, string>();

function sendTo(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToRoom(room: string, data: object, exclude?: WebSocket) {
  const members = rooms.get(room);
  if (!members) return;
  for (const ws of members) {
    if (ws !== exclude) {
      sendTo(ws, data);
    }
  }
}

function getRoomMembers(room: string): string[] {
  const members = rooms.get(room);
  if (!members) return [];
  const result: string[] = [];
  for (const ws of members) {
    const name = names.get(ws);
    if (name) result.push(name);
  }
  return result;
}

wss.on('connection', (ws) => {

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendTo(ws, { type: 'error', text: 'send json please' });
      return;
    }

    if (msg.type === 'join') {
      const name = msg.name || 'anon';
      const room = msg.room || 'general';

      if (currentRoom.has(ws)) {
        leaveRoom(ws);
      }

      names.set(ws, name);
      currentRoom.set(ws, room);

      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room)!.add(ws);

      const members = getRoomMembers(room);
      sendTo(ws, { type: 'joined', room, name, online: members });
      broadcastToRoom(room, { type: 'system', text: name + ' joined the chat' }, ws);

    } else if (msg.type === 'msg') {
      const room = currentRoom.get(ws);
      const name = names.get(ws);
      if (!room || !name) {
        sendTo(ws, { type: 'error', text: 'join a room first' });
        return;
      }
      broadcastToRoom(room, { type: 'msg', name, text: msg.text }, ws);

    } else if (msg.type === 'who') {
      const room = currentRoom.get(ws);
      if (!room) {
        sendTo(ws, { type: 'error', text: 'join a room first' });
        return;
      }
      sendTo(ws, { type: 'who', room, online: getRoomMembers(room) });

    } else if (msg.type === 'leave') {
      leaveRoom(ws);
      sendTo(ws, { type: 'left' });
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
    names.delete(ws);
    currentRoom.delete(ws);
  });
});

function leaveRoom(ws: WebSocket) {
  const room = currentRoom.get(ws);
  const name = names.get(ws) || 'anon';
  if (room && rooms.has(room)) {
    rooms.get(room)!.delete(ws);
    broadcastToRoom(room, { type: 'system', text: name + ' left the chat' });
    if (rooms.get(room)!.size === 0) {
      rooms.delete(room);
    }
  }
  currentRoom.delete(ws);
}

httpServer.listen(PORT, () => {
  console.log('chat server running on http://localhost:' + PORT);
});
