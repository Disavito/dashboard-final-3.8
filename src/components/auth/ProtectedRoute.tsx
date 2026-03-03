import React from 'react';
import { useUser } from '@/context/UserContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  resourcePath: string; // La ruta o identificador del recurso a proteger
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ resourcePath, children }) => {
  const { user, permissions, loading } = useUser(); 

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Si no hay usuario, redirigir a la página de autenticación
    return <Navigate to="/auth" replace />;
  }

  // CRÍTICO: Si permissions es null, significa que hubo un error grave o el usuario no tiene roles.
  // Si es un Set vacío, significa que no tiene permisos.
  const isAuthorized = permissions?.has(resourcePath) ?? false;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-background text-text">
        <h1 className="text-4xl font-bold text-error">Acceso Denegado</h1>
        <p className="mt-4 text-lg text-textSecondary">
          No tienes los permisos necesarios para ver esta página.
        </p>
        <p className="mt-2 text-sm text-textSecondary">
          Ruta solicitada: <code>{resourcePath}</code>
        </p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
