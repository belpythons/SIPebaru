import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * ProtectedRoute — Role-Based Route Guard
 *
 * Security Note: This component enforces role-based access at the routing level.
 * It checks if the authenticated user has ANY of the specified roles.
 * Default allowed roles: admin + super_admin (backward compatible).
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={['admin', 'super_admin', 'viewer']}>
 *     <Dashboard />
 *   </ProtectedRoute>
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles that are allowed to access this route. Defaults to ['admin', 'super_admin'] */
  allowedRoles?: string[];
}

const ProtectedRoute = ({
  children,
  allowedRoles = ["admin", "super_admin"],
}: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Check if user has ANY of the allowed roles
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .in("role", allowedRoles)
          .maybeSingle();

        setIsAuthenticated(!!roleData);
      } else {
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, [allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
