import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Verifikasi apakah user punya role admin/super_admin/viewer
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "super_admin", "viewer"])
        .limit(1)
        .maybeSingle();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error("Anda tidak memiliki akses ke panel ini");
      }

      toast({
        title: "Login berhasil",
        description: "Selamat datang di panel admin SIPebaru",
      });

      navigate("/admin");
    } catch (error: any) {
      toast({
        title: "Login gagal",
        description: error.message || "Email atau password salah",
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
              {/* Logo & Brand */}
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <img
                  src="/icon.png"
                  alt="SIPebaru"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-base sm:text-lg text-foreground leading-tight">SIPebaru</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Sistem Informasi Pengaduan Barang Rusak</span>
                </div>
              </Link>

              {/* Back Button */}
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali ke Beranda</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
            <CardHeader className="text-center pb-4 sm:pb-6 px-6 sm:px-8 pt-6 sm:pt-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-4 mx-auto">
                <img src="/icon.png" alt="SIPebaru" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                Masuk
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-11 sm:h-12 bg-background pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 h-11 sm:h-12 text-base shadow-lg hover:shadow-xl transition-shadow"
                  disabled={isLoading}
                >
                  <LogIn className="h-4 w-4" />
                  {isLoading ? "Memproses..." : "Masuk"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="bg-card/50 backdrop-blur-sm border-t mt-auto">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
              <div className="flex items-center gap-2">
                <img src="/icon.png" alt="SIPebaru" className="w-6 h-6 rounded-md object-contain" />
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

export default Login;