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
import { SipebaruAuthProvider } from "./contexts/SipebaruAuthContext";
import SipebaruSignUp from "./pages/SipebaruSignUp";
import SipebaruLogin from "./pages/SipebaruLogin";
import SipebaruDashboard from "./pages/SipebaruDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SipebaruAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
            <Route path="/admin/complaints/:id" element={<ProtectedRoute><EditComplaint /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/admin/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
            {/* SIPEBARU User Routes */}
            <Route path="/sipebaru/signup" element={<SipebaruSignUp />} />
            <Route path="/sipebaru/login" element={<SipebaruLogin />} />
            <Route path="/sipebaru/dashboard" element={<SipebaruDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SipebaruAuthProvider>
  </QueryClientProvider>
);

export default App;