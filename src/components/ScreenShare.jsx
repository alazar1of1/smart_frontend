import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

// የተሻሻሉ STUN servers ለ Remote network traversal
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const MAINTENANCE_COMMANDS = {
  scan: { output: 'Malware scan complete: 0 threats detected. System is clean.', ok: true },
  clean: { output: 'Cleaned 1.4 GB of temporary files and browser cache.', ok: true },
  update: { output: 'Installed 2 pending Windows security updates. Restart recommended.', ok: true },
  'check-disk': { output: 'Disk C: 83% free space. Disk overall health: good.', ok: true },
  optimize: { output: 'Disabled 3 unnecessary startup programs. Boot time improved.', ok: true },
  'restart-services': { output: 'Restarted Windows services (Print Spooler, Network, Audio).', ok: true },
};

const QUICK_COMMANDS = ['scan', 'clean', 'update', 'check-disk', 'optimize'];

export default function ScreenShare({ requestId, role, userName }) {
  const [phase, setPhase] = useState('idle'); // idle | requested | active | declined
  const [error, setError] = useState('');

  // Remote maintenance state
  const [controlEnabled, setControlEnabled] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState(null);
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [commandText, setCommandText] = useState('');

  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const dcRef = useRef(null);
  const requestedRef = useRef(false);
  const msgHandlerRef = useRef(() => {});
  const iceQueueRef = useRef([]);

  const addLog = (side, kind, text) => {
    setMaintenanceLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, side, kind, text },
    ]);
  };

  const sendToPeer = (msg) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(msg));
    }
  };

  const dcOpen = () => {
    return dcRef.current && dcRef.current.readyState === 'open';
  };

  const runMaintenanceCommand = (cmd) => {
    const known = MAINTENANCE_COMMANDS[String(cmd || '').trim().toLowerCase()];
    if (known) return known;
    return {
      output: `Unknown command "${cmd}". Available: ${QUICK_COMMANDS.join(', ')}, restart-services`,
      ok: false,
    };
  };

  const handlePeerMessage = (msg) => {
    switch (msg.type) {
      case 'remote:start':
        if (role === 'user') {
          setControlEnabled(true);
          addLog('sys', 'info', `${msg.techName} started remote maintenance on your computer.`);
        }
        break;

      case 'remote:cursor':
        if (role === 'user') {
          setRemoteCursor((cur) => ({
            x: msg.x,
            y: msg.y,
            pulse: msg.action === 'click' ? (cur?.pulse || 0) + 1 : cur?.pulse || 0,
          }));
        }
        break;

      case 'remote:command':
        if (role === 'user') {
          addLog('tech', 'cmd', `> ${msg.cmd}`);
          const res = runMaintenanceCommand(msg.cmd);
          setTimeout(() => {
            addLog('user', res.ok ? 'out' : 'err', res.output);
            sendToPeer({ type: 'remote:result', cmd: msg.cmd, output: res.output, success: res.ok });
          }, 400);
        }
        break;

      case 'remote:result':
        if (role === 'technician') {
          addLog('user', msg.success ? 'out' : 'err', msg.output);
        }
        break;

      case 'remote:stop':
        setControlEnabled(false);
        setRemoteCursor(null);
        addLog('sys', 'info', 'Remote maintenance ended.');
        break;

      default:
        break;
    }
  };

  const onChannelMessage = (event) => {
    try {
      msgHandlerRef.current(JSON.parse(event.data));
    } catch (err) {
      // ignore malformed messages
    }
  };

  const setupDataChannel = (dc) => {
    dcRef.current = dc;
    dc.onopen = () => {};
    dc.onclose = () => {
      dcRef.current = null;
    };
    dc.onmessage = onChannelMessage;
  };

  // ICE candidates ቀድመው ሲደርሱ በሰላም ለማስተናገድ የሚረዳ Helper
  const addIceCandidateSafely = async (candidate) => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    } else {
      iceQueueRef.current.push(candidate);
    }
  };

  const processIceQueue = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    while (iceQueueRef.current.length > 0) {
      const candidate = iceQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error processing queued ICE candidate:', err);
      }
    }
  };

  const cleanup = () => {
    iceQueueRef.current = [];
    remoteStreamRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch (err) {}
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const stopSession = () => {
    setControlEnabled(false);
    setRemoteCursor(null);
    setMaintenanceLog([]);
    cleanup();
    setPhase('idle');
    setError('');
    socket.emit('screen:stop', { requestId });
  };

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

      const dc = pc.createDataChannel('remote-maintenance');
      setupDataChannel(dc);

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

  const handleOffer = async (offer) => {
    setPhase('active');
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
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
    await processIceQueue();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('screen:answer', { requestId, answer });
  };

  // Phase ተቀይሮ DOM ሲሰራ Video Ref-ኡን የማገናኘት ስራ
  useEffect(() => {
    if (phase === 'active') {
      if (role === 'user' && localVideoRef.current && streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      if (role === 'technician' && remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    }
  }, [phase, role]);

  useEffect(() => {
    socket.emit('register', { requestId });

    const onRequest = () => {
      if (role === 'user') setPhase('requested');
    };
    const onAccept = () => {
      setPhase('active');
    };
    const onDecline = () => {
      if (role === 'technician') setPhase('idle');
    };
    const onOffer = ({ offer }) => {
      if (role === 'technician') handleOffer(offer);
    };
    const onAnswer = async ({ answer }) => {
      if (role === 'user' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await processIceQueue();
      }
    };
    const onIce = ({ candidate }) => {
      addIceCandidateSafely(candidate);
    };
    const onStopped = () => {
      setControlEnabled(false);
      setRemoteCursor(null);
      setMaintenanceLog([]);
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
  }, [requestId, role]);

  useEffect(() => {
    msgHandlerRef.current = handlePeerMessage;
  });

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
    socket.emit('screen:accept', { requestId });
    setPhase('active');
    startCapture();
  };

  const declineRequest = () => {
    setPhase('idle');
    socket.emit('screen:decline', { requestId });
  };

  const requestRemoteControl = () => {
    if (!dcOpen()) {
      setError('The connection is not ready yet. Wait a moment, then try again.');
      return;
    }
    setError('');
    setControlEnabled(true);
    addLog('sys', 'info', 'Remote maintenance started. You are in control.');
    sendToPeer({ type: 'remote:start', techName: userName });
  };

  const stopRemoteControl = () => {
    addLog('sys', 'info', 'Remote maintenance ended.');
    setControlEnabled(false);
    setRemoteCursor(null);
    sendToPeer({ type: 'remote:stop' });
  };

  const runTechCommand = (cmd) => {
    const value = (cmd || '').trim();
    if (!value) return;
    if (!dcOpen()) {
      setError('The connection is not ready yet.');
      return;
    }
    sendToPeer({ type: 'remote:command', cmd: value });
  };

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    runTechCommand(commandText);
    setCommandText('');
  };

  const normalizedVideoCoords = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleVideoMouseMove = (e) => {
    if (role !== 'technician' || !controlEnabled) return;
    const { x, y } = normalizedVideoCoords(e);
    sendToPeer({ type: 'remote:cursor', x, y, action: 'move' });
  };

  const handleVideoClick = (e) => {
    if (role !== 'technician' || !controlEnabled) return;
    const { x, y } = normalizedVideoCoords(e);
    sendToPeer({ type: 'remote:cursor', x, y, action: 'click' });
  };

  const isActive = phase === 'active';
  const isSharer = role === 'user';
  const techActive = role === 'technician' && controlEnabled;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="video-container">
        {isActive ? (
          <div
            className="video-wrap"
            onMouseMove={handleVideoMouseMove}
            onClick={handleVideoClick}
          >
            <video
              ref={isSharer ? localVideoRef : remoteVideoRef}
              autoPlay
              playsInline
              muted={isSharer}
            />
            {isSharer && controlEnabled && remoteCursor && (
              <div
                className="remote-cursor"
                style={{ left: `${remoteCursor.x * 100}%`, top: `${remoteCursor.y * 100}%` }}
              >
                🖱
                <span key={remoteCursor.pulse} className="pulse" />
              </div>
            )}
            {techActive && <div className="control-badge">🛠 Remote maintenance active</div>}
          </div>
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

        {!isSharer && isActive && !controlEnabled && dcOpen() && (
          <button className="btn btn-success" onClick={requestRemoteControl}>
            🛠 Start Remote Maintenance
          </button>
        )}

        {!isSharer && isActive && controlEnabled && (
          <button className="btn btn-outline-danger" onClick={stopRemoteControl}>
            ⏹ End Remote Maintenance
          </button>
        )}
      </div>

      {!isSharer && phase === 'active' && !controlEnabled && (
        <div className="alert alert-info" style={{ marginTop: '12px' }}>
          Waiting for the video stream. If nothing appears, ask the user to accept
          the sharing request in their browser.
        </div>
      )}

      {isSharer && controlEnabled && (
        <div className="control-panel">
          <div className="control-header">
            <span>🔧 Remote maintenance in progress</span>
            <button className="btn btn-sm btn-outline-danger" onClick={stopRemoteControl}>
              End Remote Maintenance
            </button>
          </div>
          <div className="maintenance-log">
            {maintenanceLog.map((line) => (
              <div key={line.id} className={`log-line ${line.side} ${line.kind}`}>
                {line.side === 'tech' ? (
                  <><span className="prompt">tech@main{'> '}</span>{line.text}</>
                ) : line.side === 'user' ? (
                  <><span className="prompt">user@pc{'> '}</span>{line.text}</>
                ) : (
                  line.text
                )}
              </div>
            ))}
            {maintenanceLog.length === 0 && (
              <div className="log-line sys">Waiting for the technician to take control...</div>
            )}
          </div>
        </div>
      )}

      {!isSharer && controlEnabled && (
        <div className="control-panel">
          <div className="control-header">
            <span>🛠 Remote Maintenance Console</span>
            <span className="badge badge-resolved">LIVE</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Move the mouse over the shared screen to control the user&rsquo;s remote
            cursor. Click to click for them. Send commands to repair the machine.
          </p>
          <div className="quick-commands">
            {QUICK_COMMANDS.map((cmd) => (
              <button key={cmd} className="chip" type="button" onClick={() => runTechCommand(cmd)}>
                {cmd}
              </button>
            ))}
          </div>
          <form className="control-input" onSubmit={handleCommandSubmit}>
            <input
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="Run a maintenance command and press Enter"
              autoComplete="off"
            />
            <button className="btn btn-primary" type="submit" disabled={!commandText.trim()}>
              Run
            </button>
          </form>
          <div className="maintenance-log">
            {maintenanceLog.map((line) => (
              <div key={line.id} className={`log-line ${line.side} ${line.kind}`}>
                {line.side === 'user' ? (
                  <><span className="prompt">user@pc{'> '}</span>{line.text}</>
                ) : line.side === 'tech' ? (
                  <><span className="prompt">tech@main{'> '}</span>{line.text}</>
                ) : (
                  line.text
                )}
              </div>
            ))}
            {maintenanceLog.length === 0 && (
              <div className="log-line sys">Console ready. Pick a quick command or type one.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
