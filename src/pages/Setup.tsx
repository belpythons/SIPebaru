import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";

const Setup = () => {
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin12345");
  const [confirmPassword, setConfirmPassword] = useState("admin12345");
  const [username, setUsername] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkExistingAdmin();
  }, []);

  const checkExistingAdmin = async () => {
    try {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (count && count > 0) {
        setHasAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Password tidak cocok",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password minimal 6 karakter",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      // If user already exists, try to sign in instead
      if (authError?.message === "User already registered") {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error("Email sudah terdaftar. Gunakan password yang benar atau email lain.");
        }

        if (signInData.user) {
          // Use the security definer function to setup admin
          const { error: setupError } = await supabase.rpc("setup_first_admin", {
            _user_id: signInData.user.id,
            _username: username,
          });

          if (setupError) throw setupError;

          toast({
            title: "Berhasil!",
            description: "Akun admin berhasil dibuat.",
          });

          navigate("/admin");
          return;
        }
      }

      if (authError) throw authError;

      if (authData.user) {
        // Use the security definer function to setup admin
        const { error: setupError } = await supabase.rpc("setup_first_admin", {
          _user_id: authData.user.id,
          _username: username,
        });

        if (setupError) throw setupError;

        toast({
          title: "Berhasil!",
          description: "Akun admin berhasil dibuat. Silakan login.",
        });

        navigate("/login");
      }
    } catch (error: any) {
      console.error("Setup error:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal membuat akun admin",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setup Sudah Selesai</h2>
            <p className="text-muted-foreground mb-4">
              Admin sudah terdaftar. Silakan login untuk melanjutkan.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Ke Halaman Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Setup Admin Pertama
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Buat akun admin untuk mengelola sistem
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Konfirmasi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat Akun...
                </>
              ) : (
                "Buat Akun Admin"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
