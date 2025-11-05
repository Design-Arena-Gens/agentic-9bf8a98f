export const config = { runtime: 'edge' };

type RoomClient = {
  username: string;
  ws: WebSocket;
};

type Room = {
  id: string;
  clients: Set<RoomClient>;
  lastActivity: number;
};

const ROOMS: Map<string, Room> = (globalThis as any).ROOMS ?? new Map();
(globalThis as any).ROOMS = ROOMS;

const ROOM_TTL_MS = 10 * 60 * 1000; // 10 minutes inactivity

function broadcast(room: Room, data: any) {
  const payload = JSON.stringify(data);
  room.clients.forEach(({ ws }) => {
    try { ws.send(payload); } catch {}
  });
}

function system(room: Room, text: string) {
  broadcast(room, { type: 'system', text, users: [...room.clients].map((c) => c.username) });
}

function touch(room: Room) {
  room.lastActivity = Date.now();
}

function getOrCreateRoom(id: string): Room {
  let room = ROOMS.get(id);
  if (!room) {
    room = { id, clients: new Set(), lastActivity: Date.now() };
    ROOMS.set(id, room);
  }
  return room;
}

function sweepRooms() {
  const now = Date.now();
  for (const [id, room] of ROOMS) {
    if (room.clients.size === 0 && now - room.lastActivity > ROOM_TTL_MS) {
      ROOMS.delete(id);
    }
  }
}

setInterval(sweepRooms, 60 * 1000);

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);

  // Admin stats endpoint (HTTP)
  if (req.headers.get('upgrade') !== 'websocket') {
    const key = searchParams.get('key') || '';
    const adminKey = (process.env.ADMIN_KEY || '').trim();
    if (!adminKey || key !== adminKey) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    const stats = [...ROOMS.values()].map((r) => ({ id: r.id, users: [...r.clients].map((c) => c.username), lastActivity: r.lastActivity }));
    return new Response(JSON.stringify({ rooms: stats, totalRooms: stats.length, totalUsers: stats.reduce((a, r) => a + r.users.length, 0) }), { headers: { 'content-type': 'application/json' } });
  }

  // WebSocket upgrade
  const roomId = (searchParams.get('roomId') || '').slice(0, 32);
  let username = (searchParams.get('username') || '').slice(0, 64);
  if (!roomId || !username) return new Response('Bad Request', { status: 400 });

  const pair = new (globalThis as any).WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  const room = getOrCreateRoom(roomId);

  server.accept();
  const clientObj: RoomClient = { username, ws: server as WebSocket };
  room.clients.add(clientObj);
  touch(room);

  system(room, `${username} joined`);
  broadcast(room, { type: 'users', users: [...room.clients].map((c) => c.username) });

  (server as WebSocket).onmessage = (event) => {
    touch(room);
    try {
      const data = JSON.parse(event.data as string);
      if (data.type === 'message') {
        broadcast(room, { type: 'message', text: String(data.text || '').slice(0, 4000), username, at: Date.now() });
      } else if (data.type === 'typing') {
        broadcast(room, { type: 'typing', username, isTyping: !!data.isTyping });
      } else if (data.type === 'signal') {
        // Relay signaling to others
        [...room.clients].filter((c) => c !== clientObj).forEach(({ ws }) => {
          try { ws.send(JSON.stringify({ type: 'signal', from: username, signal: data.signal })); } catch {}
        });
      }
    } catch {}
  };

  (server as WebSocket).onclose = () => {
    room.clients.delete(clientObj);
    touch(room);
    system(room, `${username} left`);
    broadcast(room, { type: 'users', users: [...room.clients].map((c) => c.username) });
    if (room.clients.size === 0) touch(room); // start TTL clock
  };

  return new Response(null, { status: 101, webSocket: client });
}
