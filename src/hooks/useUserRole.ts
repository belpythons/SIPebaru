import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch the current authenticated user's role.
 * Returns the user's role and loading state.
 *
 * Security Note: This is used for UI-level access control (hiding buttons, etc.)
 * Actual data access is enforced by RLS policies at the database level.
 */
export type AppRole = "admin" | "admin_utama" | "super_admin" | "viewer" | null;

interface UseUserRoleReturn {
    role: AppRole;
    isLoading: boolean;
}

export function useUserRole(): UseUserRoleReturn {
    const [role, setRole] = useState<AppRole>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!session?.user) {
                    setRole(null);
                    setIsLoading(false);
                    return;
                }

                // Fetch the user's role — prioritize highest privilege
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", session.user.id);

                if (roleData && roleData.length > 0) {
                    // Priority order: super_admin > admin_utama > admin > viewer
                    const roles = roleData.map((r) => r.role);
                    if (roles.includes("super_admin")) {
                        setRole("super_admin");
                    } else if (roles.includes("admin_utama")) {
                        setRole("admin_utama");
                    } else if (roles.includes("admin")) {
                        setRole("admin");
                    } else if (roles.includes("viewer")) {
                        setRole("viewer");
                    } else {
                        setRole(null);
                    }
                } else {
                    setRole(null);
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                setRole(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRole();

        // Re-check role on auth state change
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            fetchRole();
        });

        return () => subscription.unsubscribe();
    }, []);

    return { role, isLoading };
}

/**
 * Helper: check if the current role can perform write operations
 * (edit, delete, process complaints).
 * Viewers are explicitly read-only.
 */
export function canWriteComplaints(role: AppRole): boolean {
    return role === "admin" || role === "admin_utama" || role === "super_admin";
}
