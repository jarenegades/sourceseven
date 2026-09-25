import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Shield, ShieldCheck, RefreshCw } from 'lucide-react';
import { authService } from '../utils/authService';
import { authenticatedApi } from '../utils/accountApi';

interface UserProfile { id: string; email: string; first_name: string | null; last_name: string | null; is_admin: boolean; created_at: string; }

export function UserManagementPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      if (!(await authService.isAdmin())) throw new Error('Only admins can view user management');
      const result = await authenticatedApi<{ users: UserProfile[] }>('/api/admin/users');
      setUsers(result.users || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to load users'); }
    finally { setIsLoading(false); }
  };
  const promote = async (user: UserProfile) => {
    if (!confirm(`Promote ${user.email} to admin?`)) return;
    try { await authenticatedApi(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: 'PATCH', body: { is_admin: true } }); toast.success(`${user.email} promoted to admin`); await loadUsers(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to promote user'); }
  };
  useEffect(() => { void loadUsers(); }, []);
  return <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>User Management</CardTitle><CardDescription>Manage user accounts and admin permissions</CardDescription></div><Button onClick={loadUsers} disabled={isLoading} variant="outline" size="sm"><RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Refresh</Button></div></CardHeader><CardContent>{users.length === 0 ? <div className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading users...' : 'No users found'}</div> : <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.email}</TableCell><TableCell>{user.first_name || ''} {user.last_name || ''}</TableCell><TableCell>{user.is_admin ? <Badge variant="default" className="bg-purple-500"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge> : <Badge variant="secondary">User</Badge>}</TableCell><TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell><TableCell>{!user.is_admin && <Button size="sm" variant="outline" onClick={() => promote(user)}><Shield className="h-3 w-3 mr-1" />Make Admin</Button>}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>;
}
