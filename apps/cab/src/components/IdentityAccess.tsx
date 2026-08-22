import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { api } from '../lib/api';
import { useTranslation, type Locale } from '../lib/i18n';

export function IdentityAccess({ locale = 'id' }: { locale?: Locale }) {
  const copy = useTranslation(locale).shell;
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [rid, setRid] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await api.onlineUsers();
      setOnlineUsers(data.online || []);
    } catch (err) {
      console.error('Failed to fetch online users', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.provisionUser({
        username,
        password,
        roles: [role],
        rid: rid ? rid : undefined
      });
      setSuccess(`User ${username} provisioned successfully!`);
      setIsProvisioning(false);
      setUsername('');
      setPassword('');
      setRid('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mw-ai-playground">
      <div className="mw-playground-hero">
        <div>
          <div className="mw-eyebrow">IDENTITY & ACCESS</div>
          <h2>Manage Sessions & RIDs</h2>
          <p>Monitor online operators, provision new governed accounts, and bind rigid authority claims.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="primary" onClick={() => setIsProvisioning(true)}>
            Provision New User
          </Button>
        </div>
      </div>

      {success && <div style={{ background: 'var(--mw-positive-subtle)', color: 'var(--mw-positive)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{success}</div>}
      {error && <div style={{ background: 'var(--mw-danger-subtle)', color: 'var(--mw-danger)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Online Sessions ({onlineUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {onlineUsers.length === 0 ? (
            <div className="mw-empty">No active sessions found.</div>
          ) : (
            <table className="mw-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mw-border)' }}>
                  <th style={{ padding: '8px' }}>User ID</th>
                  <th style={{ padding: '8px' }}>Username</th>
                  <th style={{ padding: '8px' }}>RID Binding</th>
                  <th style={{ padding: '8px' }}>Roles</th>
                  <th style={{ padding: '8px' }}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {onlineUsers.map((u, i) => (
                  <tr key={u.userId || i} style={{ borderBottom: '1px solid var(--mw-border)' }}>
                    <td style={{ padding: '8px' }}><code>{u.userId}</code></td>
                    <td style={{ padding: '8px' }}><strong>{u.username}</strong></td>
                    <td style={{ padding: '8px' }}>
                      {u.rid ? <Badge tone="info">{u.rid}</Badge> : <Badge tone="neutral">UNBOUND</Badge>}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {u.roles?.map((r: string) => <Badge key={r} tone={r === 'ADMIN' ? 'danger' : 'neutral'} style={{marginRight:'4px'}}>{r}</Badge>)}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {u.lastSeen ? new Date(u.lastSeen).toLocaleString() : 'UNKNOWN'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {isProvisioning && (
        <Modal title="Provision New Account" onClose={() => !loading && setIsProvisioning(false)}>
          <form onSubmit={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong>Username</strong>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="mw-input" placeholder="e.g. analyst-01" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong>Password</strong>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} className="mw-input" placeholder="Minimum 12 characters" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong>Role</strong>
              <select value={role} onChange={e => setRole(e.target.value)} className="mw-input">
                <option value="USER">USER</option>
                <option value="REVIEWER">REVIEWER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong>RID (Optional)</strong>
              <input type="text" value={rid} onChange={e => setRid(e.target.value)} className="mw-input" placeholder="e.g. RID-ID-01" />
            </label>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsProvisioning(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Provisioning...' : 'Provision Account'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
