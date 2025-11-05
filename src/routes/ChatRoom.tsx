import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WSClient, IncomingMessage } from '@/lib/ws';
import { VoiceCallManager } from '@/lib/webrtc';
import { generateUsername } from '@/lib/utils';

export default function ChatRoom() {
  const [, params] = useRoute('/chat/:roomId');
  const roomId = params?.roomId ?? '';
  const [, setLocation] = useLocation();
  const [username] = useState(generateUsername());
  const wsRef = useRef<WSClient>();
  const [messages, setMessages] = useState<{ id: number; text: string; username?: string; system?: boolean }[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [text, setText] = useState('');
  const typingTimeout = useRef<number | null>(null);

  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const callRef = useRef<VoiceCallManager>();

  useEffect(() => {
    if (!roomId) return;
    const ws = new WSClient({ roomId, username });
    ws.connect();
    wsRef.current = ws;

    const off = ws.on((msg: IncomingMessage) => {
      if (msg.type === 'system') {
        setUsers(msg.users);
        setMessages((m) => [...m, { id: Date.now() + Math.random(), text: msg.text, system: true }]);
      } else if (msg.type === 'message') {
        setMessages((m) => [...m, { id: msg.at, text: msg.text, username: msg.username }]);
      } else if (msg.type === 'typing') {
        setTyping((cur) => {
          const set = new Set(cur);
          if (msg.isTyping) set.add(msg.username);
          else set.delete(msg.username);
          return [...set];
        });
      } else if (msg.type === 'users') {
        setUsers(msg.users);
      } else if (msg.type === 'signal') {
        if (!callRef.current) callRef.current = new VoiceCallManager(username, (signal) => ws.send({ type: 'signal', signal }));
        callRef.current.handleSignal(msg.signal);
        setInCall(true);
      }
    });

    return () => {
      off();
      ws.close();
      callRef.current?.stop();
    };
  }, [roomId, username]);

  const sendMessage = () => {
    if (!text.trim()) return;
    wsRef.current?.send({ type: 'message', text });
    setText('');
  };

  const handleTyping = (value: string) => {
    setText(value);
    wsRef.current?.send({ type: 'typing', isTyping: true });
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => wsRef.current?.send({ type: 'typing', isTyping: false }), 1500);
  };

  const startCall = async () => {
    if (!wsRef.current) return;
    if (!callRef.current) callRef.current = new VoiceCallManager(username, (signal) => wsRef.current!.send({ type: 'signal', signal }));
    await callRef.current.start((remote) => {
      if (audioRef.current) {
        audioRef.current.srcObject = remote;
        audioRef.current.play().catch(() => {});
      }
    });
    setInCall(true);
  };

  const leaveCall = () => {
    callRef.current?.stop();
    setInCall(false);
  };

  const toggleMute = () => {
    const next = !muted;
    callRef.current?.mute(next);
    setMuted(next);
  };

  const shareUrl = useMemo(() => `${location.origin}/chat/${roomId}`, [roomId]);

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Room {roomId}</div>
          <div className="text-xs text-gray-400">You are {username}</div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy Link</Button>
          <Button variant="ghost" onClick={() => setLocation('/')}>Leave</Button>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-4 h-[60vh] overflow-y-auto flex flex-col gap-2 bg-black/20">
        {messages.map((m) => (
          <div key={m.id} className={m.system ? 'text-gray-400 text-sm italic' : ''}>
            {m.system ? (
              <span>{m.text}</span>
            ) : (
              <>
                <span className="text-primary mr-2">{m.username}</span>
                <span>{m.text}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 h-4">
        {typing.length > 0 ? `${typing.join(', ')} typing...` : ' '}
      </div>

      <div className="flex gap-2">
        <Input placeholder="Type a message" value={text} onChange={(e) => handleTyping(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
        <Button onClick={sendMessage}>Send</Button>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">Users: {users.join(', ') || '?'}</div>
        <div className="flex gap-2">
          {!inCall ? (
            <Button onClick={startCall}>Start Voice Call</Button>
          ) : (
            <>
              <Button variant="outline" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</Button>
              <Button variant="ghost" onClick={leaveCall}>Leave Call</Button>
            </>
          )}
        </div>
      </div>

      <audio ref={audioRef} autoPlay />
    </div>
  );
}
