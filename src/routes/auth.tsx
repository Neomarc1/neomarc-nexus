import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => {
    return {
      ref: search.ref as string | undefined,
    };
  },

  loader: async () => {
    const { data } = await supabase
      .from("company_profile")
      .select("site_name, site_abbreviation, site_description, logo_url")
      .eq("id", 1)
      .maybeSingle();
    return {
      branding: {
        siteName: data?.site_name || "NEOMARC REAL ESTATE",
        siteAbbreviation: data?.site_abbreviation || "N",
        siteDescription: data?.site_description || "Digital Operating System",
        logoUrl: data?.logo_url || null,
      }
    };
  },
  head: ({ loaderData }) => {
    const branding = loaderData?.branding || {
      siteName: "NEOMARC REAL ESTATE",
      siteDescription: "Digital Operating System"
    };
    return {
      meta: [
        { title: `Sign In — ${branding.siteName}` },
        {
          name: "description",
          content: `Secure sign-in to the ${branding.siteName} ${branding.siteDescription.toLowerCase()} for sales, inventory, payments and operations.`,
        },
        { property: "og:title", content: `Sign In — ${branding.siteName}` },
        {
          property: "og:description",
          content: `Secure access to the ${branding.siteName} command centre.`,
        },
      ],
    };
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const search = Route.useSearch();
  const [refCode, setRefCode] = useState(search.ref ?? "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, referral_code: refCode, phone, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. You can now sign in.");
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
    }
  }

  const { branding } = Route.useLoaderData();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="brand-gradient relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-11 w-11 rounded-xl object-cover bg-white/10 p-1" />
          ) : (
            <div className="gold-gradient flex h-11 w-11 items-center justify-center rounded-xl font-display text-xl font-bold text-gold-foreground">
              {branding.siteAbbreviation}
            </div>
          )}
          <div>
            <p className="font-display text-lg font-bold tracking-wide">{branding.siteName}</p>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">{branding.siteDescription}</p>
          </div>
        </div>
        <div>
          <h2 className="max-w-md font-display text-4xl font-bold leading-tight">
            One command centre. First inquiry to final closing.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-80">
            Land Banking | Development | Management | Sales
          </p>
          <p className="mt-8 font-display text-sm tracking-wide text-gold">
            Creating Value, and Sustainable Wealth.
          </p>
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} {branding.siteName}</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="font-display text-xl font-bold">{branding.siteName}</p>
            <p className="text-sm text-muted-foreground">Creating Value, and Sustainable Wealth.</p>
          </div>
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to the {branding.siteAbbreviation} command centre.
          </p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4 pt-4" onSubmit={signIn}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4 pt-4" onSubmit={signUp}>
                <div>
                  <Label htmlFor="refCode">Referral Code (Optional)</Label>
                  <Input
                    id="refCode"
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    placeholder="e.g. RLT-261004-A8BF3"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Sign up as</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="customer" className="bg-background">Client / Customer</option>
                    <option value="realtor" className="bg-background">Realtor / Partner</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email2">Email</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password2">Password</Label>
                  <Input
                    id="password2"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  New accounts start with customer portal access. An administrator assigns staff or
                  realtor roles.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
