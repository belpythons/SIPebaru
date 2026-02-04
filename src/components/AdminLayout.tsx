import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

import { UserCog } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: FileText, label: "Data Pengaduan", path: "/admin/complaints" },
  { icon: Building2, label: "Departemen", path: "/admin/departments" },
  { icon: BarChart3, label: "Laporan", path: "/admin/reports" },
  { icon: Users, label: "Pengaturan Akun", path: "/admin/accounts" },
  { icon: UserCog, label: "Manajemen User", path: "/admin/users" },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Modern gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-blue-400/5 to-cyan-300/5" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-cyan-400/15 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4" />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Sidebar - Desktop */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border transition-all duration-300 hidden md:block shadow-xl",
            isSidebarOpen ? "w-64" : "w-20"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                {isSidebarOpen && (
                  <div className="overflow-hidden">
                    <h1 className="text-lg font-bold text-sidebar-foreground">SIPebaru</h1>
                    <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-sidebar-border">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all duration-200 w-full"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                {isSidebarOpen && <span>Logout</span>}
              </button>
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute -right-3 top-20 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-sidebar p-4 md:hidden flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="font-bold text-sidebar-foreground">SIPebaru</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-sidebar pt-16 md:hidden">
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all duration-200 w-full mt-4"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-300 pt-16 md:pt-0",
            isSidebarOpen ? "md:ml-64" : "md:ml-20"
          )}
        >
          {/* Top Bar */}
          <header className="hidden md:flex h-16 bg-card/80 backdrop-blur-sm border-b border-border items-center px-6 sticky top-0 z-30">
            <h2 className="text-lg font-semibold text-foreground">
              SIPebaru Admin Panel
            </h2>
          </header>

          {/* Page Content */}
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;