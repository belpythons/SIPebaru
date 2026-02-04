import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Password tidak cocok",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password minimal 6 karakter",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("signup-admin", {
        body: {
          email: formData.email,
          password: formData.password,
          username: formData.username,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Gagal mendaftar");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Pendaftaran Berhasil",
        description: "Akun Anda menunggu aktivasi oleh Admin Utama. Silakan hubungi admin untuk proses aktivasi.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Pendaftaran Gagal",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-400/10 to-cyan-300/5" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-blue-300/15 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
      
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
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Sistem Informasi Pengaduan Barang Rusak</span>
                </div>
              </Link>

              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali ke Login</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
            <CardHeader className="text-center pb-4 sm:pb-6 px-6 sm:px-8 pt-6 sm:pt-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-4 mx-auto">
                <UserPlus className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                Daftar Admin
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Buat akun admin baru. Akun akan diaktivasi oleh Admin Utama.
              </p>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Nama Lengkap</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    minLength={3}
                    className="h-11 sm:h-12 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-11 sm:h-12 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="h-11 sm:h-12 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="h-11 sm:h-12 bg-background"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 h-11 sm:h-12 text-base shadow-lg hover:shadow-xl transition-shadow"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Daftar
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Login di sini
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
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

export default AdminSignup;
