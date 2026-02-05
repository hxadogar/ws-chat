import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

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

// get list of names in a room
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

      // leave old room first if in one
      if (currentRoom.has(ws)) {
        leaveRoom(ws);
      }

      names.set(ws, name);
      currentRoom.set(ws, room);

      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room)!.add(ws);

      // tell them who is online
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
      // list who is in your room
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

console.log('chat server running on port ' + PORT);
