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

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/requests/${id}`);
        setRequest(data.request);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load request.');
      }
    };
    load();
  }, [id]);

  // Real-time updates for status / chat
  useEffect(() => {
    socket.emit('register', { userId: user?._id, requestId: id });
    const onUpdated = (updated) => {
      if (String(updated._id) === String(id)) setRequest(updated);
    };
    socket.on('request:updated', onUpdated);
    return () => socket.off('request:updated', onUpdated);
  }, [id, user]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!request) return <Spinner />;

  return (
    <div>
      <div className="topbar">
        <h1>Request Details</h1>
        <Link to="/requests" className="btn btn-outline">← Back to My Requests</Link>
      </div>

      <div className="row">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{request.title}</h3>
            <StatusBadge status={request.status} />
          </div>

          <div className="detail-label">Category</div>
          <div className="detail-value">{request.category}</div>

          <div className="detail-label">Description</div>
          <div className="detail-value">{request.description}</div>

          <div className="detail-label">Submitted</div>
          <div className="detail-value">{new Date(request.createdAt).toLocaleString()}</div>

          <div className="detail-label">Technician Solution</div>
          {request.technicianResponse ? (
            <div className="solution-box">
              {request.technicianResponse}
            </div>
          ) : (
            <div className="detail-value" style={{ color: 'var(--text-muted)' }}>
              No solution provided yet.
            </div>
          )}
        </div>

        <div className="card">
          <h3>💬 Chat with Technician</h3>
          <ChatBox
            requestId={id}
            currentUserId={user?._id}
            currentUserName={user?.name}
          />
        </div>
      </div>

      <div className="card">
        <h3>🖥️ Screen Sharing</h3>
        <ScreenShare requestId={id} role="user" userName={user?.name} />
      </div>
    </div>
  );
}
