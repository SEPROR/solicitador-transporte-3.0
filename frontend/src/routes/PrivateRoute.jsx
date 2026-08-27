import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PrivateRoute({ children, requireGilog = false }) {
  const { loading, autenticado, isGilog } = useAuth();

  if (loading) {
    return null; // ou um spinner/loading screen, se preferir
  }

  if (!autenticado) {
    return <Navigate to="/" replace />;
  }

  if (requireGilog && !isGilog) {
    return <Navigate to="/chamado" replace />;
  }

  return children;
}