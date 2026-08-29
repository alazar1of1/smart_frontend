import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';

export default function AllRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [assigning, setAssigning] = useState({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, techRes] = await Promise.all([
          api.get('/requests'),
          isAdmin ? api.get('/auth/technicians') : Promise.resolve({ data: { technicians: [] } }),
        ]);
        setRequests(reqRes.data.requests);
        setTechnicians(techRes.data.technicians || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (loading) return <Spinner />;

  const filtered =
    filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    'in-progress': requests.filter((r) => r.status === 'in-progress').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  };

  const filters = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'in-progress', label: `In Progress (${counts['in-progress']})` },
    { key: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  const handleAssign = async (requestId, technicianId) => {
    setAssigning((prev) => ({ ...prev, [requestId]: true }));
    try {
      const { data } = await api.put(`/requests/${requestId}/assign`, {
        technicianId,
      });
      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? data.request : r))
      );
    } catch (err) {
      console.error(err.response?.data?.message || 'Failed to assign.');
    } finally {
      setAssigning((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1>{isAdmin ? 'All Requests' : 'My Assigned Requests'}</h1>
        <span className="user-greet">{requests.length} total request(s)</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            className={`btn ${filter === f.key ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">📭</div>
          <p>No requests in this category.</p>
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
                <th>Assigned To</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>{r.title}</td>
                  <td>{r.user?.name || 'Unknown'}</td>
                  <td>{r.category}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={r.assignedTo?._id || ''}
                        onChange={(e) => handleAssign(r._id, e.target.value)}
                        disabled={assigning[r._id]}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                      >
                        <option value="">Unassigned</option>
                        {technicians.map((t) => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      r.assignedTo?.name || 'Unassigned'
                    )}
                  </td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
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
  );
}
