"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { loginApi, fetchMe, fetchCounters } from "@/lib/authApi";
import { LogIn, Store, User, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // If already logged in, redirect
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      fetchMe()
        .then((data) => {
          // already valid — super admin has no billing, land on admin
          const role = (data as any)?.user?.role;
          router.replace(role === "SUPER_ADMIN" ? "/admin" : "/");
        })
        .catch(() => {
          // token invalid, stay
        });
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) return setError("Email and password required");
    setLoading(true);
    try {
      // Counter is resolved server-side: STAFF auto-attach to their assigned
      // counter (or the emptiest one); owner picks after login via the header.
      const res = await loginApi({ email: email.trim().toLowerCase(), password });
      // store auth
      const user = res.user as any;
      const shop = res.shop ?? (user.shop ?? null);
      // fetch counters for shop
      let counterList: { id: string; name: string; shopId: string; isActive: boolean }[] = [];
      try {
        if (shop?.id) {
          const cData = await fetchCounters(shop.id);
          counterList = cData.counters as any;
        } else if (user.role === "SUPER_ADMIN") {
          // super admin: fetch all, but keep empty for now
          counterList = [];
        } else {
          const me = await fetchMe();
          counterList = (me as any).counters ?? [];
        }
      } catch {
        counterList = [];
      }

      setAuth(res.accessToken, user, shop, counterList as any);

      const assignedName = (res as any).counter?.name ?? user.counter?.name;
      setInfo(
        user.role === "STAFF" && assignedName
          ? `Signed in — billing on ${assignedName}.`
          : "Login successful — redirecting..."
      );
      // SUPER_ADMIN never bills (owner & counter-staff only) — land on admin
      router.replace(user.role === "SUPER_ADMIN" ? "/admin" : "/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchCountersPreview = async () => {
    // Preview counters for shop: not needed without login, but we can attempt after email known? Keep disabled
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> GB Retail Login
          </CardTitle>
          <div className="text-xs text-muted-foreground">Multi-shop • Multi-counter • Email + Password</div>
          {process.env.NODE_ENV !== "production" && (
            <div className="text-[11px] text-muted-foreground/80">
              Demo: <span className="font-mono">super@gbretail.local / super123</span> • <span className="font-mono">owner@shop.local / owner123</span> • <span className="font-mono">staff1@shop.local / staff123</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@shop.local"
                className="h-9 text-sm"
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-sm"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {info && <div className="text-xs text-primary font-medium">{info}</div>}

            <Button type="submit" className="w-full h-9 gap-2" disabled={loading}>
              <LogIn className="w-4 h-4" /> {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-[11px] text-muted-foreground text-center space-y-1">
            <div>Each shop's staff can log into any counter of that shop — counter + user are tracked on every bill.</div>
            <div>Super admin creates shops → shop owner creates counters & staff.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
