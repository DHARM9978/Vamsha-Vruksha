
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

import { loginSchema, type LoginValues } from "@/lib/schemas";
import { signIn, getSession } from "@/services/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [credentialError, setCredentialError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (getSession()) {
      navigate({ to: "/app", replace: true });
    }
  }, [navigate]);

  async function onSubmit(values: LoginValues) {
    setCredentialError("");

    try {
      const session = await signIn(
        values.email.trim(),
        values.password
      );

      toast.success(
        `Welcome back, ${session.fullName.split(" ")[0]}`,
        {
          description: `Signed in as ${
            session.role === "admin" ? "Admin" : "User"
          }.`,
        }
      );

      navigate({ to: "/app", replace: true });
    } catch (error) {
      setCredentialError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            aria-label="Back to home"
            className="text-foreground"
          >
            <Logo />
          </Link>

          <ThemeToggle />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="shadow-card">
            <CardContent className="p-7 sm:p-9">
              <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                Sign in
              </h1>

              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your registered email or mobile number to access
                your family's records.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-7 space-y-4"
                noValidate
              >
                {credentialError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                  >
                    {credentialError}
                  </p>
                )}

                <FormField
                  label="Email or Mobile Number"
                  htmlFor="login-email"
                  required
                  error={errors.email?.message}
                >
                  <Input
                    id="login-email"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    placeholder="name@example.com or 9876543210"
                    disabled={isSubmitting}
                    {...register("email")}
                  />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="login-password"
                  required
                  error={errors.password?.message}
                >
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    disabled={isSubmitting}
                    {...register("password")}
                  />
                </FormField>

                <div className="flex items-center justify-between text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>

                  <Link
                    to="/signup"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Create account
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}

                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-gold/40 bg-secondary/60 shadow-card">
            <CardContent className="flex h-full flex-col justify-center p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck
                  className="size-6 text-primary"
                  aria-hidden="true"
                />
              </div>

              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                Your family history, securely connected
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Access your family records, manage relationships,
                explore your family tree and preserve your family's
                heritage in one place.
              </p>

              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  Secure account authentication
                </div>

                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  Role-based application access
                </div>

                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  Centralized family information
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
