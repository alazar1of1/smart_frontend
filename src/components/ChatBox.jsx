import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { socket } from '../socket';

// Reusable real-time chat widget. Messages are saved to the database
// through the API and also broadcast instantly over Socket.IO.
export default function ChatBox({ requestId, currentUserId, currentUserName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const boxRef = useRef(null);

  // Load chat history from the backend
  useEffect(() => {
    const loadChat = async () => {
      try {
        const { data } = await api.get(`/requests/${requestId}`);
        setMessages(data.request.chat || []);
      } catch (err) {
        console.error('Failed to load chat', err);
      } finally {
        setLoading(false);
      }
    };
    loadChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // Listen for new real-time messages
  useEffect(() => {
    const handler = (payload) => {
      if (payload.requestId === requestId) {
        setMessages((prev) => [...prev, payload.message]);
      }
    };
    socket.on('chat:receive', handler);
    return () => socket.off('chat:receive', handler);
  }, [requestId]);

  // Auto scroll to the newest message
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const message = {
      user: currentUserId,
      name: currentUserName,
      text: text.trim(),
      createdAt: new Date(),
    };

    // Broadcast instantly over the socket
    socket.emit('chat:send', {
      requestId,
      sender: currentUserId,
      senderName: currentUserName,
      message,
    });

    // Save to the database so history persists
    try {
      await api.post(`/requests/${requestId}/messages`, { text: text.trim() });
    } catch (err) {
      console.error('Failed to save message', err);
    }

    setMessages((prev) => [...prev, message]);
    setText('');
  };

  const formatTime = (d) => {
    const date = new Date(d);
    if (isNaN(date)) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-box">
      <div className="chat-messages" ref={boxRef}>
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading chat...</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            No messages yet. Say hello to start the conversation.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = String(m.user) === String(currentUserId);
          return (
            <div key={i} className={`chat-msg ${mine ? 'mine' : ''}`}>
              <div className="bubble">{m.text}</div>
              <div className="meta">
                {mine ? 'You' : m.name || 'Other'} · {formatTime(m.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
}
