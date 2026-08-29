import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'technician', label: 'Technician' },
  { value: 'admin', label: 'Admin' },
];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (user) => {
    setEditingId(user._id);
    setEditingRole(user.role);
  };

  const handleSave = async (userId) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/auth/users/${userId}`, { role: editingRole });
      setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
      setEditingId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(userId);
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="layout"><main className="main"><Spinner /></main></div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      <div className="topbar">
        <h1>Manage Users 👥</h1>
        <span className="user-greet">{users.length} total user(s)</span>
      </div>

      <div className="card">
        {users.length === 0 ? (
          <div className="empty-state">
            <div className="big-icon">👥</div>
            <p>No users found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th style={{ width: '220px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>@{u.username}</td>
                    <td>
                      {editingId === u._id ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                      )}
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      {editingId === u._id ? (
                        <>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSave(u._id)}
                            disabled={saving}
                            style={{ marginRight: '6px' }}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEdit(u)}
                            style={{ marginRight: '6px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(u._id)}
                            disabled={deletingId === u._id}
                          >
                            {deletingId === u._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
