import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateRoomId } from '@/lib/utils';
import { useState } from 'react';

export default function Home() {
  const [, setLocation] = useLocation();
  const [roomInput, setRoomInput] = useState('');

  const createRoom = () => {
    const id = generateRoomId();
    setLocation(`/chat/${id}`);
  };

  const joinRoom = () => {
    const id = roomInput.trim();
    if (!id) return;
    setLocation(`/chat/${id}`);
  };

  return (
    <div className="max-w-xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Anonymous Rooms</h1>
      <p className="text-gray-400">Create or join an anonymous room. No sign-up.</p>

      <div className="flex gap-3">
        <Button onClick={createRoom}>Create Room</Button>
      </div>

      <div className="flex gap-3 items-center">
        <Input placeholder="Enter room id (e.g. abc123xyz)" value={roomInput} onChange={(e) => setRoomInput(e.target.value)} />
        <Button variant="outline" onClick={joinRoom}>Join</Button>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        Tip: Share the link with a friend to chat or start a voice call.
      </div>
    </div>
  );
}
