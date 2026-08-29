import { useState } from 'react';
import api from '../../api/axios';

const ROLES = [
  { value: 'user', label: 'User', desc: 'Can create and track support requests' },
  { value: 'technician', label: 'Technician', desc: 'Manages and resolves requests' },
  { value: 'admin', label: 'Admin', desc: 'Full access, creates accounts' },
];

export default function AddUser() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name,
        username,
        password,
        role,
      });
      setSuccess(`Account created: ${data.user.username} (${data.user.role})`);
      setName('');
      setUsername('');
      setPassword('');
      setRole('user');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1>Add User</h1>
        <span className="user-greet">Create new accounts for users or technicians</span>
      </div>

      <div className="card form-card">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <div className="role-toggle">
              {ROLES.map((r) => (
                <label key={r.value} className={role === r.value ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              {ROLES.find((r) => r.value === role)?.desc}
            </small>
          </div>

          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
