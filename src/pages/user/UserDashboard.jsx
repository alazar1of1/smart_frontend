import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, reqRes] = await Promise.all([
          api.get('/requests/stats'),
          api.get('/requests/mine'),
        ]);
        setStats(statsRes.data.stats);
        setRecent(reqRes.data.requests.slice(0, 5));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      }
    };
    load();
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <Spinner />;

  const cards = [
    { label: 'Total Requests', value: stats.total, cls: 'blue', icon: '📋' },
    { label: 'Pending', value: stats.pending, cls: 'warning', icon: '⏳' },
    { label: 'In Progress', value: stats.inProgress, cls: 'info', icon: '🔄' },
    { label: 'Resolved', value: stats.resolved, cls: 'success', icon: '✅' },
  ];

  return (
    <div>
      <div className="topbar">
        <h1>Welcome back, {user?.name} 👋</h1>
        <span className="user-greet">Track and manage your ICT issues here</span>
      </div>

      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-label">{c.icon} {c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Recent Requests</h3>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="big-icon">📭</div>
            <p>You haven't submitted any requests yet.</p>
            <Link to="/requests/new" className="btn btn-primary" style={{ marginTop: '12px' }}>
              ➕ Create Your First Request
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r._id}>
                    <td>{r.title}</td>
                    <td>{r.category}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/requests/${r._id}`} className="btn btn-sm btn-outline">
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
    </div>
  );
}
