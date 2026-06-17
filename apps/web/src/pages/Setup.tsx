import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SETUP_STATUS_QUERY_KEY } from "@/lib/auth/setup";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  username: z.string().min(1, "Username is required").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function Setup() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (auth.status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [auth.status, navigate]);

  if (auth.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await auth.bootstrap(values.email, values.username, values.password);
      queryClient.setQueryData(SETUP_STATUS_QUERY_KEY, { needsSetup: false });
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not create admin account. Please try again.";
      setError("password", { message });
      toast({ title: "Setup failed", description: message, variant: "destructive" });
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
            <CardTitle className="text-base font-medium">Create the first admin</CardTitle>
            <CardDescription>
              No admin account exists yet. Create one to access the panel.
            </CardDescription>
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
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email ? (
                <p id="email-error" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[11px] uppercase tracking-tight-wide text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                disabled={isSubmitting}
                aria-invalid={errors.username ? true : undefined}
                aria-describedby={errors.username ? "username-error" : undefined}
                {...register("username")}
              />
              {errors.username ? (
                <p id="username-error" className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-tight-wide text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              {errors.password ? (
                <p id="password-error" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
