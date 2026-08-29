import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { socket } from '../../socket';
import StatusBadge from '../../components/StatusBadge';
import ChatBox from '../../components/ChatBox';
import ScreenShare from '../../components/ScreenShare';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function RequestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/requests/${id}`);
        setRequest(data.request);
        setStatus(data.request.status);
        setResponse(data.request.technicianResponse || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load request.');
      }
    };
    load();
  }, [id]);

  // Real-time updates
  useEffect(() => {
    socket.emit('register', { userId: user?._id, requestId: id });
    const onUpdated = (updated) => {
      if (String(updated._id) === String(id)) {
        setRequest(updated);
        setStatus(updated.status);
        setResponse(updated.technicianResponse || '');
      }
    };
    socket.on('request:updated', onUpdated);
    return () => socket.off('request:updated', onUpdated);
  }, [id, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/requests/${id}`, { status, technicianResponse: response });
      setRequest(data.request);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!request) return <Spinner />;

  return (
    <div>
      <div className="topbar">
        <h1>Request #{request._id.slice(-6).toUpperCase()}</h1>
        <Link to="/tech/requests" className="btn btn-outline">← Back to All Requests</Link>
      </div>

      <div className="row">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{request.title}</h3>
            <StatusBadge status={request.status} />
          </div>

          <div className="detail-label">Reported By</div>
          <div className="detail-value">
            {request.user?.name} (@{request.user?.username})
          </div>

          <div className="detail-label">Category</div>
          <div className="detail-value">{request.category}</div>

          <div className="detail-label">Description</div>
          <div className="detail-value">{request.description}</div>

          <div className="detail-label">Submitted</div>
          <div className="detail-value">{new Date(request.createdAt).toLocaleString()}</div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

          <h3>Update Request</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-group">
              <label>Technician Response / Solution</label>
              <textarea
                rows={4}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write the solution or instructions for the user..."
              />
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>💬 Chat with User</h3>
          <ChatBox
            requestId={id}
            currentUserId={user?._id}
            currentUserName={user?.name}
          />
        </div>
      </div>

      <div className="card">
        <h3>🖥️ Screen Sharing</h3>
        <ScreenShare requestId={id} role="technician" userName={user?.name} />
      </div>
    </div>
  );
}
