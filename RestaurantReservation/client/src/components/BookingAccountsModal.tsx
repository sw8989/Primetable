import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PLATFORMS = [
  { id: 'resy', label: 'Resy', description: "Mountain, Brat, Kiln, Lyle's, Bao…" },
  { id: 'opentable', label: 'OpenTable', description: 'Dishoom, The Wolseley, Sketch…' },
  { id: 'sevenrooms', label: 'SevenRooms', description: 'Gymkhana, Core, Zuma…' },
  { id: 'tock', label: 'Tock', description: 'The Clove Club…' },
];

const USER_ID = 1; // demo user

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BookingAccountsModal({ open, onClose }: Props) {
  const [connected, setConnected] = useState<Record<string, { email: string }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) fetchConnected();
  }, [open]);

  async function fetchConnected() {
    try {
      const res = await fetch(`/api/user/${USER_ID}/credentials`);
      const data = await res.json();
      setConnected(data.credentials || {});
    } catch {
      setConnected({});
    }
  }

  async function save(platformId: string) {
    if (!form.email || !form.password) {
      setError('Email and password are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, platform: platformId, email: form.email, password: form.password }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      await fetchConnected();
      setEditing(null);
      setForm({ email: '', password: '' });
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove(platformId: string) {
    setRemoving(platformId);
    try {
      await fetch(`/api/user/credentials/${platformId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID }),
      });
      await fetchConnected();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-dark text-light max-w-md">
        <DialogHeader>
          <DialogTitle className="text-light">Booking Accounts</DialogTitle>
          <p className="text-sm text-gray-400">Connect your accounts so Prime Table can book on your behalf.</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {PLATFORMS.map(p => {
            const info = connected[p.id];
            const isEditing = editing === p.id;

            return (
              <div key={p.id} className="border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {info
                        ? <CheckCircle className="h-4 w-4 text-green-400" />
                        : <XCircle className="h-4 w-4 text-gray-500" />}
                      <span className="font-semibold">{p.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-6">{info ? info.email : p.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {info ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-400 hover:text-white"
                          onClick={() => { setEditing(p.id); setForm({ email: info.email, password: '' }); setError(''); }}
                        >
                          Change
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-400 hover:text-red-300"
                          disabled={removing === p.id}
                          onClick={() => remove(p.id)}
                        >
                          {removing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-gray-600"
                        onClick={() => { setEditing(p.id); setForm({ email: '', password: '' }); setError(''); }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <Label className="text-xs text-gray-300">{p.label} email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white mt-1"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-300">{p.label} password</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white mt-1"
                        placeholder="••••••••"
                      />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => save(p.id)} disabled={saving} className="bg-secondary text-dark hover:bg-secondary/90">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setError(''); }} className="text-gray-400">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Passwords are encrypted with AES-256-GCM and never returned to the browser.
        </p>
      </DialogContent>
    </Dialog>
  );
}
