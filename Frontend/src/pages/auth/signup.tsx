
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, UserPlus, RefreshCw } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField, PasswordRuleChecklist } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

import { signupSchema, type SignupValues } from "@/lib/schemas";
import { api } from "@/lib/api-client";

type SignupStep = "form" | "otp";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

interface RegisterResponse {
  userId: number;
  email: string;
}

const OTP_RESEND_SECONDS = 60;

export function SignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<SignupStep>("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [formError, setFormError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendIn, setResendIn] = useState(OTP_RESEND_SECONDS);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema) as never,
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, resendIn]);

  async function onSubmit(values: SignupValues) {
    setFormError("");

    try {
      const response = await api.post<ApiResponse<RegisterResponse>>(
        "/auth/register",
        {
          userName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.mobile.trim(),
          password: values.password,
        }
      );

      const email = response.data?.email ?? values.email.trim().toLowerCase();

      setRegisteredEmail(email);
      setOtp("");
      setOtpError("");
      setResendIn(OTP_RESEND_SECONDS);
      setStep("otp");

      toast.success("Registration started", {
        description: `A verification code has been sent to ${email}.`,
      });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not start registration. Please try again."
      );
    }
  }

  async function handleVerifyOtp() {
    if (!registeredEmail) {
      setOtpError("Registration email is missing. Please register again.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Please enter the complete six-digit verification code.");
      return;
    }

    setOtpError("");
    setOtpLoading(true);

    try {
      await api.post<ApiResponse>("/auth/verify-otp", {
        email: registeredEmail,
        otp,
      });

      toast.success("Account verified successfully", {
        description: "You can now sign in with your registered credentials.",
      });

      navigate({ to: "/login", replace: true });
    } catch (error) {
      setOtpError(
        error instanceof Error
          ? error.message
          : "OTP verification failed. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!registeredEmail || resendIn > 0 || resendLoading) {
      return;
    }

    setOtpError("");
    setResendLoading(true);

    try {
      await api.post<ApiResponse>("/auth/resend-otp", {
        email: registeredEmail,
      });

      setOtp("");
      setResendIn(OTP_RESEND_SECONDS);

      toast.success("Verification code sent", {
        description: `A new OTP has been sent to ${registeredEmail}.`,
      });
    } catch (error) {
      setOtpError(
        error instanceof Error
          ? error.message
          : "Could not resend the verification code."
      );
    } finally {
      setResendLoading(false);
    }
  }

  function handleBackToForm() {
    setStep("form");
    setOtp("");
    setOtpError("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" aria-label="Back to home" className="text-foreground">
            <Logo />
          </Link>

          <ThemeToggle />
        </div>

        <Card className="shadow-card">
          <CardContent className="p-7 sm:p-9">
            {step === "form" ? (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                  Create your account
                </h1>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  Start your family's digital record in minutes.
                </p>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-7 space-y-4"
                  noValidate
                >
                  {formError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                    >
                      {formError}
                    </p>
                  )}

                  <FormField
                    label="Full Name"
                    htmlFor="signup-name"
                    required
                    error={errors.fullName?.message}
                  >
                    <Input
                      id="signup-name"
                      autoComplete="name"
                      placeholder="Your full name"
                      disabled={isSubmitting}
                      {...register("fullName")}
                    />
                  </FormField>

                  <FormField
                    label="Email Address"
                    htmlFor="signup-email"
                    required
                    error={errors.email?.message}
                  >
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      disabled={isSubmitting}
                      {...register("email")}
                    />
                  </FormField>

                  <FormField
                    label="Mobile Number"
                    htmlFor="signup-mobile"
                    required
                    hint="10-digit Indian mobile number"
                    error={errors.mobile?.message}
                  >
                    <Input
                      id="signup-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="e.g. 9880012345"
                      disabled={isSubmitting}
                      {...register("mobile")}
                    />
                  </FormField>

                  <FormField
                    label="Password"
                    htmlFor="signup-password"
                    required
                    error={errors.password?.message}
                  >
                    <PasswordInput
                      id="signup-password"
                      autoComplete="new-password"
                      placeholder="Create a password"
                      disabled={isSubmitting}
                      {...register("password")}
                    />

                    <PasswordRuleChecklist
                      value={watch("password") ?? ""}
                    />
                  </FormField>

                  <FormField
                    label="Confirm Password"
                    htmlFor="signup-confirm"
                    required
                    error={errors.confirmPassword?.message}
                  >
                    <PasswordInput
                      id="signup-confirm"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      disabled={isSubmitting}
                      {...register("confirmPassword")}
                    />
                  </FormField>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}

                    {isSubmitting ? "Creating account…" : "Sign up"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already registered?{" "}
                    <Link
                      to="/login"
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-wide text-foreground">
                  Verify your email
                </h1>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter the six-digit code sent to your registered email
                  address to activate your account.
                </p>

                <div className="mt-5 rounded-lg border border-border bg-secondary/50 px-3 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Verification email:
                  </span>
                  <p className="mt-1 break-all font-semibold text-foreground">
                    {registeredEmail}
                  </p>
                </div>

                <div className="mt-7 space-y-4">
                  {otpError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                    >
                      {otpError}
                    </p>
                  )}

                  <FormField
                    label="Six-digit verification code"
                    htmlFor="signup-otp"
                  >
                    <InputOTP
                      id="signup-otp"
                      maxLength={6}
                      value={otp}
                      onChange={(value) => {
                        setOtp(value);
                        setOtpError("");
                      }}
                      disabled={otpLoading}
                      aria-label="Six-digit verification code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>

                      <InputOTPSeparator />

                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormField>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={resendIn > 0 || resendLoading}
                      onClick={handleResendOtp}
                    >
                      {resendLoading ? (
                        <Loader2 className="mr-1 inline size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 inline size-3" />
                      )}

                      {resendLoading
                        ? "Sending…"
                        : resendIn > 0
                          ? `Resend in ${resendIn}s`
                          : "Resend code"}
                    </button>

                    <button
                      type="button"
                      className="hover:underline"
                      disabled={otpLoading}
                      onClick={handleBackToForm}
                    >
                      Back
                    </button>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={otpLoading || otp.length !== 6}
                    onClick={handleVerifyOtp}
                  >
                    {otpLoading && (
                      <Loader2 className="size-4 animate-spin" />
                    )}

                    {otpLoading ? "Verifying…" : "Verify & create account"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
