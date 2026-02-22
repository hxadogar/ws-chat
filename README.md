# ws-chat

a simple websocket chat i made to learn about websockets and real-time stuff. you can create rooms and chat with people.

i wanted to understand how websocket connections work under the hood before using higher level libraries like socket.io. so i built this from scratch with just the `ws` npm package.

## how to run

```
npm install
npm start
```

then open http://localhost:3000 in your browser. open another tab to chat with yourself lol.

## how it works

the server tracks rooms and users. clients send json messages over websocket:

**join a room:**
```json
{"type": "join", "name": "hamza", "room": "general"}
```

**send a message:**
```json
{"type": "msg", "text": "hello everyone"}
```

**see whos online (or type /who in the chat):**
```json
{"type": "who"}
```

**leave:**
```json
{"type": "leave"}
```

## stuff i learned building this

- how websocket connections work (upgrade from http, frames, etc)
- why you need to check readyState before sending
- handling disconnects and cleaning up (if you dont delete from the room map you get ghost users)
- broadcasting to everyone except the sender
- serving static html alongside websocket from same port

nothing groundbreaking but it was a good learning exercise.
