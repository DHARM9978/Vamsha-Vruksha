
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  KeyRound,
  Loader2,
  MailQuestion,
  ArrowLeft,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormField,
  PasswordRuleChecklist,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import {
  forgotSchema,
  resetSchema,
  type ForgotValues,
  type ResetValues,
} from "@/lib/schemas";
import { api, type ApiResponse } from "@/lib/api-client";

type Step = "email" | "otp" | "reset";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stepError, setStepError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const emailForm = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema) as never,
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function submitEmail(values: ForgotValues) {
    setStepError("");

    const normalizedEmail = values.email.trim().toLowerCase();

    try {
      await api.post<ApiResponse<unknown>>(
        "/auth/forgot-password",
        {
          email: normalizedEmail,
        },
      );

      setEmail(normalizedEmail);
      setOtp("");
      setStep("otp");

      toast.success("Verification code requested", {
        description: `Check your registered email address: ${normalizedEmail}`,
      });
    } catch (error) {
      setStepError(
        error instanceof Error
          ? error.message
          : "Could not send the verification code. Please try again.",
      );
    }
  }

  async function verifyOtp() {
    setStepError("");

    if (!/^\d{6}$/.test(otp)) {
      setStepError("Enter the complete six-digit verification code.");
      return;
    }

    setVerifyingOtp(true);

    try {
      await api.post<ApiResponse<unknown>>(
        "/auth/verify-reset-otp",
        {
          email,
          otp,
        },
      );

      setStep("reset");

      toast.success("Email verified", {
        description: "You can now choose a new password.",
      });
    } catch (error) {
      setStepError(
        error instanceof Error
          ? error.message
          : "Invalid or expired verification code. Please try again.",
      );
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function submitReset(values: ResetValues) {
    setStepError("");

    try {
      await api.post<ApiResponse<unknown>>(
        "/auth/reset-password",
        {
          email,
          otp,
          newPassword: values.password,
        },
      );

      toast.success("Password reset successfully", {
        description: "You can now sign in using your new password.",
      });

      navigate({
        to: "/login",
        replace: true,
      });
    } catch (error) {
      setStepError(
        error instanceof Error
          ? error.message
          : "Could not reset your password. Please try again.",
      );
    }
  }

  function goBackToEmail() {
    setStepError("");
    setOtp("");
    setStep("email");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
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

        <Card className="shadow-card">
          <CardContent className="p-7 sm:p-9">
            {/* STEP 1: EMAIL */}
            {step === "email" && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                  Forgot password
                </h1>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter your registered email address. We will send you
                  a verification code to reset your password.
                </p>

                <form
                  onSubmit={emailForm.handleSubmit(submitEmail)}
                  className="mt-7 space-y-4"
                  noValidate
                >
                  {stepError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                    >
                      {stepError}
                    </p>
                  )}

                  <FormField
                    label="Email"
                    htmlFor="forgot-email"
                    required
                    error={emailForm.formState.errors.email?.message}
                  >
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      disabled={emailForm.formState.isSubmitting}
                      {...emailForm.register("email")}
                    />
                  </FormField>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={emailForm.formState.isSubmitting}
                  >
                    {emailForm.formState.isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MailQuestion className="size-4" />
                    )}

                    {emailForm.formState.isSubmitting
                      ? "Sending verification code…"
                      : "Continue"}
                  </Button>
                </form>
              </>
            )}

            {/* STEP 2: OTP */}
            {step === "otp" && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                  Verify it's you
                </h1>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  Step 2 of 3 — enter the six-digit verification code
                  sent to your email address.
                </p>

                <p className="mt-4 text-sm text-muted-foreground">
                  Verification for{" "}
                  <span className="font-semibold text-foreground">
                    {email}
                  </span>
                </p>

                <div className="mt-7 space-y-4">
                  {stepError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                    >
                      {stepError}
                    </p>
                  )}

                  <FormField
                    label="Six-digit verification code"
                    htmlFor="reset-otp"
                  >
                    <InputOTP
                      id="reset-otp"
                      maxLength={6}
                      value={otp}
                      onChange={(value) => {
                        setOtp(value);
                        setStepError("");
                      }}
                      disabled={verifyingOtp}
                      aria-label="Six-digit verification code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormField>

                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={verifyingOtp || otp.length !== 6}
                    onClick={() => void verifyOtp()}
                  >
                    {verifyingOtp ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}

                    {verifyingOtp ? "Verifying…" : "Verify code"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={verifyingOtp}
                    onClick={goBackToEmail}
                  >
                    <ArrowLeft className="size-4" />
                    Change email address
                  </Button>
                </div>
              </>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === "reset" && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                  Choose a new password
                </h1>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  Step 3 of 3 — create a new password for your account.
                </p>

                <form
                  onSubmit={resetForm.handleSubmit(submitReset)}
                  className="mt-7 space-y-4"
                  noValidate
                >
                  {stepError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                    >
                      {stepError}
                    </p>
                  )}

                  <FormField
                    label="New Password"
                    htmlFor="reset-password"
                    required
                    error={resetForm.formState.errors.password?.message}
                  >
                    <PasswordInput
                      id="reset-password"
                      autoComplete="new-password"
                      disabled={resetForm.formState.isSubmitting}
                      {...resetForm.register("password")}
                    />

                    <PasswordRuleChecklist
                      value={resetForm.watch("password") ?? ""}
                    />
                  </FormField>

                  <FormField
                    label="Confirm New Password"
                    htmlFor="reset-confirm"
                    required
                    error={
                      resetForm.formState.errors.confirmPassword?.message
                    }
                  >
                    <PasswordInput
                      id="reset-confirm"
                      autoComplete="new-password"
                      disabled={resetForm.formState.isSubmitting}
                      {...resetForm.register("confirmPassword")}
                    />
                  </FormField>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={resetForm.formState.isSubmitting}
                  >
                    {resetForm.formState.isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}

                    {resetForm.formState.isSubmitting
                      ? "Updating password…"
                      : "Update password"}
                  </Button>
                </form>
              </>
            )}

            <p className="mt-6 border-t border-border pt-4 text-center text-sm">
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline"
              >
                Back to Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
