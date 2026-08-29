import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const isTech = user?.role === 'technician' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const nav = [
    isTech
      ? { to: '/tech/dashboard', icon: '📊', label: 'Dashboard' }
      : { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    ...(isTech
      ? [
          { to: isAdmin ? '/admin/dashboard' : '/tech/dashboard', icon: '🎛️', label: isAdmin ? 'Dashboard' : 'Dashboard' },
          { to: isAdmin ? '/admin/requests' : '/tech/requests', icon: '📋', label: isAdmin ? 'All Requests' : 'My Requests' },
          ...(isAdmin ? [
              { to: '/admin/users', icon: '➕', label: 'Add User' },
              { to: '/admin/users/manage', icon: '👥', label: 'Manage Users' },
            ] : []),
        ]
      : [
          { to: '/requests/new', icon: '➕', label: 'New Request' },
          { to: '/requests', icon: '📋', label: 'My Requests' },
        ]),
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon">🛠️</div>
          <div>
            <h2>Smart ICT Help Desk</h2>
            <small>Report. Track. Solve.</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              end={item.to === '/requests' || item.to === '/tech/requests' || item.to === '/admin/requests' || item.to === '/dashboard' || item.to === '/tech/dashboard' || item.to === '/admin/dashboard' || item.to === '/admin/users' || item.to === '/admin/users/manage'}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div>
            <div className="u-name">{user?.name}</div>
            <div className="u-role">
              {user?.role === 'technician'
                ? 'ICT Technician'
                : user?.role === 'admin'
                ? 'Admin'
                : 'User'}
            </div>
          </div>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={handleLogout}
            style={{ marginLeft: 'auto' }}
            title="Logout"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
