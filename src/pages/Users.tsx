import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users as UsersIcon, Plus, Search, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Users() {
  const { restEndpoint, masterToken } = useStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const [saving, setSaving] = useState(false);

  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');
  const roles = ['All', 'Admin', 'Manager', 'User'];

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      } else {
        // Users endpoint may not exist yet — show empty with note
        setUsers([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [restEndpoint]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'All' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roleColors: Record<string, string> = {
    Admin: 'bg-brand-danger/20 text-brand-danger',
    Manager: 'bg-brand-warning/20 text-brand-warning',
    User: 'bg-brand-primary/20 text-brand-primary',
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and email are required', false);
      return;
    }
    setSaving(true);
    try {
      // Users CRUD may not exist yet — store locally for now
      const newUser = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        role,
        status: 'active',
        joined: new Date().toISOString().split('T')[0],
      };
      setUsers(prev => [newUser, ...prev]);
      setName(''); setEmail(''); setRole('User'); setShowAddForm(false);
      showToast(`User ${newUser.name} added`, true);
    } catch (err: any) {
      showToast(err.message || 'Failed to add user', false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast(`${name} removed`, true);
  };

  const handleToggleStatus = (id: string, name: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: nextStatus } : u));
    showToast(`${name} set to ${nextStatus}`, true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
      {/* Toast */}
      {toast && (
        <div className={cn("fixed top-20 right-6 z-50 px-4 py-2 rounded-xl border text-xs font-bold font-mono", toast.ok ? "bg-brand-success/10 text-brand-success border-brand-success/30" : "bg-brand-danger/10 text-brand-danger border-brand-danger/30")}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <UsersIcon className="w-8 h-8 mr-3 text-brand-primary" />
            Users
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">USER MANAGEMENT & ADMINISTRATION</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddUser} className="p-5 bg-brand-surface border border-brand-border rounded-2xl space-y-4 overflow-hidden">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-text">New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Full Name</label>
                <input type="text" placeholder="e.g. Chimwemwe Phiri" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Email</label>
                <input type="email" placeholder="e.g. phiri@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="User">User</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-semibold shadow-glow-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Add User'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted" />
          <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary" />
        </div>
        <div className="flex gap-2">
          {roles.map(r => (
            <button key={r} onClick={() => setSelectedRole(r)}
              className={cn('px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all',
                selectedRole === r ? 'bg-brand-primary border-brand-primary text-white shadow-glow-primary' : 'bg-brand-surface border-brand-border text-brand-text-muted hover:border-brand-primary/40')}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-brand-elevated rounded" />)}
        </div>
      ) : error ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center">
          <AlertCircle className="w-8 h-8 text-brand-danger mx-auto mb-3" />
          <p className="text-brand-text-muted font-mono text-sm">{error}</p>
          <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-brand-elevated border border-brand-border rounded-xl text-xs font-bold uppercase">Retry</button>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border text-[10px] font-mono font-bold text-brand-text-muted uppercase tracking-widest bg-brand-elevated">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredUsers.map((user, idx) => (
                  <motion.tr key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="hover:bg-brand-elevated/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-bold text-brand-primary uppercase">
                          {(user.name || '?')[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-brand-text">{user.name}</div>
                          <div className="text-xs text-brand-text-muted font-mono">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider', roleColors[user.role] || 'bg-brand-text-muted/20 text-brand-text-muted')}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button onClick={() => handleToggleStatus(user.id, user.name, user.status)}
                        className={cn('px-2 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-all',
                          user.status === 'active' ? 'bg-brand-success/15 text-brand-success hover:bg-brand-success/25' : 'bg-brand-text-muted/15 text-brand-text-muted hover:bg-brand-text-muted/25')}>
                        {user.status === 'active' ? <CheckCircle className="w-3.5 h-3.5 text-brand-success" /> : <XCircle className="w-3.5 h-3.5 text-brand-text-muted" />}
                        {user.status}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs text-brand-text-muted font-mono">{user.joined}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleToggleStatus(user.id, user.name, user.status)}
                          className="px-3 py-1.5 text-xs font-bold text-brand-text bg-brand-elevated rounded-lg hover:bg-brand-border/30 border border-brand-border transition-colors flex items-center gap-1">
                          <Edit2 className="w-3 h-3" /> Toggle
                        </button>
                        <button onClick={() => handleDeleteUser(user.id, user.name)}
                          className="px-3 py-1.5 text-xs font-bold text-brand-danger bg-brand-danger/10 rounded-lg hover:bg-brand-danger/20 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-brand-text-muted font-mono uppercase text-xs tracking-widest">
                      {users.length === 0 ? 'No users found. Add your first user to get started.' : 'No users match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
