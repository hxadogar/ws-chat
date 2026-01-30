import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

// track who is in which room
// each room is just a set of websockets
const rooms = new Map<string, Set<WebSocket>>();

// track username for each connection
const names = new Map<WebSocket, string>();

// track which room each person is in (one room at a time for simplicity)
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
      // join a room with a username
      const name = msg.name || 'anon';
      const room = msg.room || 'general';

      names.set(ws, name);
      currentRoom.set(ws, room);

      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room)!.add(ws);

      // tell the user they joined
      sendTo(ws, { type: 'joined', room, name });

      // tell everyone else
      broadcastToRoom(room, { type: 'system', text: name + ' joined the chat' }, ws);

    } else if (msg.type === 'msg') {
      // send a message to the room
      const room = currentRoom.get(ws);
      const name = names.get(ws);
      if (!room || !name) {
        sendTo(ws, { type: 'error', text: 'join a room first' });
        return;
      }

      broadcastToRoom(room, { type: 'msg', name, text: msg.text }, ws);

    } else if (msg.type === 'leave') {
      leaveRoom(ws);
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
    // clean up empty rooms
    if (rooms.get(room)!.size === 0) {
      rooms.delete(room);
    }
  }
  currentRoom.delete(ws);
}

console.log('chat server running on port ' + PORT);
