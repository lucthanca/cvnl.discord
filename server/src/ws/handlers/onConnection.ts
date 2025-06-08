import { Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const eventsDir = path.join(globalThis.__dirname, 'ws/events');
const eventFiles = fs.readdirSync(eventsDir).filter(file => file.endsWith('.js'));

const loadedEvents: Map<string, (socket: Socket, ...args: any[]) => void> = new Map();
for (const file of eventFiles) {
  const eventName = path.basename(file, path.extname(file));
  const filePath = path.join(eventsDir, file);
  const fileUrl = pathToFileURL(filePath).href;
  const eventHandler = (await import(fileUrl)).default;
  if (typeof eventHandler === 'function') {
    loadedEvents.set(eventName, eventHandler);
  } else {
    console.warn(`Event handler in ${file} is not a function, skipping.`);
  }
}

export async function onConnection(socket: Socket) {
  console.log('New socket.io connection:', socket.id, 'from:', socket.handshake.address);
  // listen for all events in the loadedEvents map
  for (const [eventName, eventHandler] of loadedEvents.entries()) {
    socket.on(eventName, (...args: any[]) => eventHandler(socket, ...args));
  }
  socket.emit('connected', {
    message: 'Socket.IO đã tạo kết nối. Vui lòng xác thực.',
    socketId: socket.id
  });
}
