import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homePathForRole } from './AuthContext';

interface Props {
  children: React.ReactNode;
  space: 'app' | 'member';   // 'app' = back-office (staff), 'member' = espace membre
}

const ProtectedRoute: React.FC<Props> = ({ children, space }) => {
  const { loading, role, isStaff } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Chargement…
      </div>
    );
  }

  // Pas connecté -> page de connexion
  if (!role) return <Navigate to="/connexion" replace />;

  // Back-office réservé au staff
  if (space === 'app' && !isStaff) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  // Espace membre : on laisse passer un membre (et le staff peut aussi le consulter)
  // Si tu veux le réserver strictement aux membres, remplace par: if (space === 'member' && role !== 'member')

  return <>{children}</>;
};

export default ProtectedRoute;
