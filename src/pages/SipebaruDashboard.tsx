import { Link, useNavigate } from "react-router-dom";
import { Package, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSipebaruAuth } from "@/contexts/SipebaruAuthContext";
import { useEffect } from "react";

const SipebaruDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading, logout } = useSipebaruAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/sipebaru/login");
    }
  }, [user, isLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-400/10 to-cyan-300/5" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex h-14 sm:h-16 items-center justify-between">
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary text-primary-foreground">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base sm:text-lg text-foreground leading-tight">SIPebaru</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Dashboard User</span>
                </div>
              </Link>
              <Button variant="outline" onClick={handleLogout} className="gap-2" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Selamat Datang, {user.nama}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Dashboard pengguna SIPEBARU
              </p>
            </div>

            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informasi Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama</p>
                    <p className="font-medium">{user.nama}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NPK</p>
                    <p className="font-medium">{user.npk}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit Kerja</p>
                    <p className="font-medium">{user.unit_kerja}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RFID</p>
                    <p className="font-medium">{user.rfid || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-card/50 backdrop-blur-sm border-t mt-auto">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
                  <Package className="h-3 w-3" />
                </div>
                <span className="font-medium text-foreground text-sm">SIPebaru</span>
              </div>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground text-center">
                © {new Date().getFullYear()} Sistem Informasi Pengaduan Barang Rusak
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SipebaruDashboard;
