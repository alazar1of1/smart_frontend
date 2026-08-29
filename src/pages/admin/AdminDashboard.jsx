import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, reqRes, usersRes] = await Promise.all([
          api.get('/requests/stats'),
          api.get('/requests'),
          api.get('/auth/users'),
        ]);
        setStats(statsRes.data.stats);
        setRequests(reqRes.data.requests.slice(0, 6));
        setUsers(usersRes.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner />;

  const totalUsers = users.length;
  const usersByRole = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const cards = [
    { label: 'Total Users', value: totalUsers || 0, cls: 'blue', icon: '👥' },
    { label: 'Technicians', value: usersByRole.technician || 0, cls: 'info', icon: '🛠️' },
    { label: 'Total Requests', value: stats?.total || 0, cls: 'warning', icon: '📋' },
    { label: 'Resolved', value: stats?.resolved || 0, cls: 'success', icon: '✅' },
  ];

  return (
    <div>
      <div className="topbar">
        <h1>Admin Dashboard 🎛️</h1>
        <span className="user-greet">System overview and management</span>
      </div>

      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-label">{c.icon} {c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Latest Requests</h3>
            <Link to="/admin/requests" className="btn btn-sm btn-outline">View All</Link>
          </div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="big-icon">📭</div>
              <p>No requests submitted yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>User</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id}>
                      <td>{r.title}</td>
                      <td>{r.user?.name || 'Unknown'}</td>
                      <td>{r.category}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Link to={`/admin/requests/${r._id}`} className="btn btn-sm btn-outline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Users</h3>
            <Link to="/admin/users/manage" className="btn btn-sm btn-outline">Manage All</Link>
          </div>
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="big-icon">👥</div>
              <p>No users yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 6).map((u) => (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td>@{u.username}</td>
                      <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
