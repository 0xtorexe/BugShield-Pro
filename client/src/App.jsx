import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import Dashboard from './pages/Dashboard';
import Users from './pages/admin/Users';
import Audit from './pages/admin/Audit';
import Projects from './pages/projects/Projects';
import ProjectDetail from './pages/projects/ProjectDetail';
import Bugs from './pages/bugs/Bugs';
import BugDetail from './pages/bugs/BugDetail';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute roles={['admin']}><Audit /></ProtectedRoute>} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/bugs/:id" element={<BugDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
