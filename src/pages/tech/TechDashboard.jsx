import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';

export default function TechDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, reqRes] = await Promise.all([
          api.get('/requests/stats'),
          api.get('/requests'),
        ]);
        setStats(statsRes.data.stats);
        setRequests(reqRes.data.requests.slice(0, 6));
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
        <h1>Technician Dashboard 🛠️</h1>
        <span className="user-greet">Manage incoming ICT support requests</span>
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
        <h3>Latest Requests</h3>
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
                      <Link to={`/tech/requests/${r._id}`} className="btn btn-sm btn-outline">
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
