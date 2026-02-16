import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/admin/Dashboard";
import Complaints from "./pages/admin/Complaints";
import EditComplaint from "./pages/admin/EditComplaint";
import Reports from "./pages/admin/Reports";
import Accounts from "./pages/admin/Accounts";
import Departments from "./pages/admin/Departments";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

/**
 * RBAC Route Configuration:
 * - Dashboard, Complaints, Reports: accessible by admin, super_admin, AND viewer
 * - EditComplaint: accessible by admin, super_admin, AND viewer (viewer gets read-only mode)
 * - Accounts, Departments: admin + super_admin only (management functions)
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />

          {/* Admin routes — viewer can access (read-only UI enforced in components) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin", "viewer"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin", "viewer"]}>
                <Complaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin", "viewer"]}>
                <EditComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin", "viewer"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Management routes — admin + super_admin only */}
          <Route
            path="/admin/accounts"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <Accounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <Departments />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;