import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🦁</div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (profile === null && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}
