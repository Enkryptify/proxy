import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (auth.status === "authenticated") {
      navigate(from, { replace: true });
    }
  }, [auth.status, from, navigate]);

  if (auth.status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await auth.login(values.email, values.password);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Sign in failed. Please try again.";
      setError("password", { message });
      toast({ title: "Sign in failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Enkryptify" className="h-7 w-auto" />
            <span className="text-[13px] font-semibold uppercase tracking-tight-wide text-foreground">
              Enkryptify
            </span>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">Sign in to admin panel</CardTitle>
            <CardDescription>Authenticate with your Enkryptify admin credentials.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-tight-wide text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                disabled={isSubmitting}
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-tight-wide text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
