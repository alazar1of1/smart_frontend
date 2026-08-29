import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import UserDashboard from './pages/user/UserDashboard';
import CreateRequest from './pages/user/CreateRequest';
import MyRequests from './pages/user/MyRequests';
import UserRequestDetails from './pages/user/RequestDetails';
import TechDashboard from './pages/tech/TechDashboard';
import AllRequests from './pages/tech/AllRequests';
import TechRequestDetails from './pages/tech/RequestDetails';
import AddUser from './pages/admin/AddUser';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import Spinner from './components/Spinner';

// Technician and admin both use the technician-side dashboard
const isTech = (role) => role === 'technician' || role === 'admin';

// Redirect to the correct dashboard if logged in
function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  return <Navigate to={user.role === 'technician' ? '/tech/dashboard' : '/dashboard'} />;
}

// Only allow users
function UserRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  if (isTech(user.role)) return <Navigate to="/tech/dashboard" />;
  return children;
}

// Only allow technicians/admins
function TechRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  if (!isTech(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

// Only allow admins
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/tech/dashboard" />;
  return children;
}

// Wrap pages inside the sidebar layout
const withLayout = (element) => <Layout>{element}</Layout>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* User pages */}
      <Route
        path="/dashboard"
        element={<UserRoute>{withLayout(<UserDashboard />)}</UserRoute>}
      />
      <Route
        path="/requests/new"
        element={<UserRoute>{withLayout(<CreateRequest />)}</UserRoute>}
      />
      <Route
        path="/requests"
        element={<UserRoute>{withLayout(<MyRequests />)}</UserRoute>}
      />
      <Route
        path="/requests/:id"
        element={<UserRoute>{withLayout(<UserRequestDetails />)}</UserRoute>}
      />

      {/* Technician pages */}
      <Route
        path="/tech/dashboard"
        element={<TechRoute>{withLayout(<TechDashboard />)}</TechRoute>}
      />
      <Route
        path="/tech/requests"
        element={<TechRoute>{withLayout(<AllRequests />)}</TechRoute>}
      />
      <Route
        path="/tech/requests/:id"
        element={<TechRoute>{withLayout(<TechRequestDetails />)}</TechRoute>}
      />

      {/* Admin pages */}
      <Route
        path="/admin/dashboard"
        element={<AdminRoute>{withLayout(<AdminDashboard />)}</AdminRoute>}
      />
      <Route
        path="/admin/requests"
        element={<AdminRoute>{withLayout(<AllRequests />)}</AdminRoute>}
      />
      <Route
        path="/admin/users"
        element={<AdminRoute>{withLayout(<AddUser />)}</AdminRoute>}
      />
      <Route
        path="/admin/users/manage"
        element={<AdminRoute>{withLayout(<ManageUsers />)}</AdminRoute>}
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
