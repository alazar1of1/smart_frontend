import { useEffect, useState } from 'react';

// Lines the simulated "PC diagnostics" console types out, over and over.
const LOG_LINES = [
  { text: '> booting SMART-ICT OS v3.2', cls: 'cmd' },
  { text: '> connecting to help-desk server ... [OK]', cls: 'ok' },
  { text: '> scanning CPU / RAM / GPU ... [OK]', cls: 'ok' },
  { text: '> checking network adapter eth0 ... [OK]', cls: 'ok' },
  { text: '> firewall status: ENABLED', cls: 'ok' },
  { text: '> malware definitions: UPDATED', cls: 'ok' },
  { text: '> disk health: 82% free space', cls: 'info' },
  { text: '> driver check: all up to date', cls: 'ok' },
  { text: '> system healthy. standing by ...', cls: 'info' },
];

const FLOATING_BADGES = [
  { icon: '🖥️', className: 'fa-1' },
  { icon: '📡', className: 'fa-2' },
  { icon: '🔧', className: 'fa-3' },
  { icon: '⚡', className: 'fa-4' },
  { icon: '🛠', className: 'fa-5' },
  { icon: '💾', className: 'fa-6' },
];

// Animated troubleshooting-themed background for the login page,
// inspired by the fullscreen animated hero of max.adobe.com.
export default function LoginBackdrop() {
  const [visible, setVisible] = useState(1);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const typer = setInterval(() => {
      setVisible((v) => (v >= LOG_LINES.length ? 1 : v + 1));
    }, 1500);
    const blink = setInterval(() => setCursorVisible((c) => !c), 480);
    return () => {
      clearInterval(typer);
      clearInterval(blink);
    };
  }, []);

  return (
    <div className="auth-backdrop" aria-hidden="true">
      <div className="backdrop-grid" />
      <div className="scan-line" />

      {/* Radar / system heartbeat */}
      <div className="radar">
        <div className="radar-ring ring-1" />
        <div className="radar-ring ring-2" />
        <div className="radar-sweep" />
        <div className="radar-center" />
      </div>

      {/* Floating tech badges */}
      <div className="float-badges">
        {FLOATING_BADGES.map((b) => (
          <span key={b.className} className={`float-badge ${b.className}`}>
            {b.icon}
          </span>
        ))}
      </div>

      {/* Live diagnostics console */}
      <div className="terminal-window">
        <div className="terminal-titlebar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="terminal-title">smart-ict-diagnostics</span>
        </div>
        <div className="terminal-body">
          {LOG_LINES.slice(0, visible).map((line, i) => (
            <div key={i} className={`term-line ${line.cls}`}>
              {line.text}
            </div>
          ))}
          <span className={`term-line cursor${cursorVisible ? '' : ' hidden'}`}>▋</span>
        </div>
      </div>
    </div>
  );
}