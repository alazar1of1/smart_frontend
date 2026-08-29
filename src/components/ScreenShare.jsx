import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

const STUN_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// Shared screen-sharing component.
// - role "user":       shares the screen (sharer) via getDisplayMedia
// - role "technician": views the shared screen (viewer)
// Signaling is relayed through Socket.IO rooms named "request:{id}".
export default function ScreenShare({ requestId, role, userName }) {
  const [phase, setPhase] = useState('idle'); // idle | requested | active | declined
  const [error, setError] = useState('');

  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const requestedRef = useRef(false); // tracks if this side requested sharing

  // ---------- helper: close connection and clean up ----------
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const stopSession = () => {
    cleanup();
    setPhase('idle');
    setError('');
    socket.emit('screen:stop', { requestId });
  };

  // ---------- sharer: start capturing the screen ----------
  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(STUN_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('screen:ice', { requestId, candidate: e.candidate });
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'disconnected'
        ) {
          setError('Connection lost. Please try again.');
          stopSession();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('screen:offer', { requestId, offer });

      setPhase('active');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Screen sharing permission was denied.');
        socket.emit('screen:decline', { requestId });
        setPhase('idle');
      } else {
        setError('Could not start screen sharing: ' + err.message);
      }
    }
  };

  // ---------- viewer: create answer when the offer arrives ----------
  const handleOffer = async (offer) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('screen:ice', { requestId, candidate: e.candidate });
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'disconnected'
      ) {
        setError('Connection lost. Please try again.');
        stopSession();
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('screen:answer', { requestId, answer });
  };

  // ---------- socket listeners ----------
  useEffect(() => {
    socket.emit('register', { requestId });

    const onRequest = () => {
      // Only the user should react to a request banner
      if (role === 'user') setPhase('requested');
    };
    const onAccept = () => {
      // User already starts capturing when accepting; tech shows connecting
      if (role === 'technician') setPhase('active');
    };
    const onDecline = () => {
      if (role === 'technician') setPhase('idle');
    };
    const onOffer = ({ offer }) => {
      if (role === 'technician') handleOffer(offer);
    };
    const onAnswer = ({ answer }) => {
      if (role === 'user' && pcRef.current) {
        pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };
    const onIce = ({ candidate }) => {
      if (pcRef.current) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };
    const onStopped = () => {
      cleanup();
      setPhase('idle');
      setError('');
    };

    socket.on('screen:request', onRequest);
    socket.on('screen:accept', onAccept);
    socket.on('screen:decline', onDecline);
    socket.on('screen:offer', onOffer);
    socket.on('screen:answer', onAnswer);
    socket.on('screen:ice', onIce);
    socket.on('screen:stopped', onStopped);

    return () => {
      socket.off('screen:request', onRequest);
      socket.off('screen:accept', onAccept);
      socket.off('screen:decline', onDecline);
      socket.off('screen:offer', onOffer);
      socket.off('screen:answer', onAnswer);
      socket.off('screen:ice', onIce);
      socket.off('screen:stopped', onStopped);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, role]);

  // ---------- technician: request sharing ----------
  const requestSharing = () => {
    requestedRef.current = true;
    setPhase('requested');
    socket.emit('screen:request', { requestId });
  };

  const cancelRequest = () => {
    requestedRef.current = false;
    setPhase('idle');
    socket.emit('screen:decline', { requestId });
  };

  const acceptRequest = () => {
    startCapture();
  };

  const declineRequest = () => {
    setPhase('idle');
    socket.emit('screen:decline', { requestId });
  };

  const isActive = phase === 'active';
  const isSharer = role === 'user';

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="video-container">
        {isActive ? (
          <video
            ref={isSharer ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={isSharer}
          />
        ) : (
          <div className="empty-video">
            <div className="big-icon">🖥️</div>
            <p>
              {isSharer
                ? 'Screen sharing is off. A technician may request to view your screen.'
                : 'No live screen share. Use the button below to request the user\u2019s screen.'}
            </p>
          </div>
        )}
      </div>

      <div className="share-actions">
        {isSharer && phase === 'requested' && (
          <>
            <button className="btn btn-success" onClick={acceptRequest}>
              ✅ Accept Screen Sharing
            </button>
            <button className="btn btn-outline-danger" onClick={declineRequest}>
              Decline
            </button>
          </>
        )}

        {isSharer && phase === 'idle' && (
          <div className="alert alert-info" style={{ width: '100%' }}>
            <strong>{userName}</strong>, you are in control. Accept only when the
            ICT technician asks you to share your screen.
          </div>
        )}

        {!isSharer && phase === 'idle' && (
          <button className="btn btn-primary" onClick={requestSharing}>
            📡 Request Screen Sharing
          </button>
        )}

        {!isSharer && phase === 'requested' && (
          <button className="btn btn-outline-danger" onClick={cancelRequest}>
            Cancel Request
          </button>
        )}

        {isActive && (
          <button className="btn btn-danger" onClick={stopSession}>
            ⏹ Stop Screen Sharing
          </button>
        )}
      </div>

      {!isSharer && phase === 'active' && (
        <div className="alert alert-info" style={{ marginTop: '12px' }}>
          Waiting for the video stream. If nothing appears, ask the user to accept
          the sharing request in their browser.
        </div>
      )}
    </div>
  );
}
