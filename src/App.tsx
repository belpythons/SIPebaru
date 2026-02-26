import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PortalBadge from "./pages/PortalBadge";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/admin/Dashboard";
import Complaints from "./pages/admin/Complaints";
import EditComplaint from "./pages/admin/EditComplaint";
import Reports from "./pages/admin/Reports";
import Accounts from "./pages/admin/Accounts";
import Departments from "./pages/admin/Departments";
import ImportData from "./pages/admin/ImportData";
import ActivityLogs from "./pages/admin/ActivityLogs";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Publik */}
          <Route path="/" element={<PortalBadge />} />
          <Route path="/pengaduan" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />

          {/* Admin (dilindungi) */}
          <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
          <Route path="/admin/complaints/:id" element={<ProtectedRoute><EditComplaint /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/admin/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
          <Route path="/admin/import" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
          <Route path="/admin/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;