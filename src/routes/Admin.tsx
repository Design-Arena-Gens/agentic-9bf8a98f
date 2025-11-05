import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Admin() {
  const [key, setKey] = useState('');

  const { data, refetch, isFetching, error } = useQuery({
    queryKey: ['admin-stats', key],
    enabled: false,
    queryFn: async () => {
      const res = await fetch(`/api/ws?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error('Unauthorized');
      return (await res.json()) as { totalRooms: number; totalUsers: number; rooms: { id: string; users: string[]; lastActivity: number }[] };
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="flex gap-2 items-center">
        <Input placeholder="Enter admin key" value={key} onChange={(e) => setKey(e.target.value)} />
        <Button onClick={() => refetch()} disabled={!key || isFetching}>Load</Button>
      </div>
      {error && <div className="text-red-400 text-sm">Failed to load. Check key.</div>}
      {data && (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">Rooms: {data.totalRooms} ? Users: {data.totalUsers}</div>
          <div className="border border-white/10 rounded-lg divide-y divide-white/10">
            {data.rooms.map((r) => (
              <div key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.id}</div>
                  <div className="text-xs text-gray-400">Last activity: {new Date(r.lastActivity).toLocaleString()}</div>
                </div>
                <div className="text-sm">{r.users.join(', ') || '?'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
