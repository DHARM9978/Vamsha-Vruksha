
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

import { otpSchema, type OtpValues } from "@/lib/schemas";
import { resendOtp, verifyOtp } from "@/services/auth";

const RESEND_SECONDS = 30;

interface OtpPanelProps {
  contextEmail?: string;
  onVerified: () => void | Promise<void>;
  onBack: () => void;
  verifyLabel?: string;
}

export function OtpPanel({
  contextEmail,
  onVerified,
  onBack,
  verifyLabel = "Verify",
}: OtpPanelProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const otp = watch("otp");

  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = window.setTimeout(() => {
      setResendIn((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function onSubmit(values: OtpValues) {
    setError("");

    try {
      const verified = await verifyOtp(values.otp);

      if (!verified) {
        setError("The verification code is invalid or expired. Please try again.");
        return;
      }

      await onVerified();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OTP verification failed. Please try again."
      );
    }
  }

  async function handleResend() {
    if (resendIn > 0 || isResending) return;

    setError("");
    setIsResending(true);

    try {
      await resendOtp();
      setValue("otp", "");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not resend the verification code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {contextEmail && (
        <p className="text-sm text-muted-foreground">
          Verification for{" "}
          <span className="font-semibold text-foreground">
            {contextEmail}
          </span>
        </p>
      )}

      <FormField
        label="Six-digit verification code"
        htmlFor="otp"
        error={error}
      >
        <InputOTP
          id="otp"
          maxLength={6}
          value={otp}
          onChange={(value) => {
            setValue("otp", value, { shouldValidate: true });
            setError("");
          }}
          aria-label="Six-digit verification code"
          disabled={isSubmitting || isResending}
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
          disabled={resendIn > 0 || isResending || isSubmitting}
          onClick={handleResend}
        >
          {isResending ? (
            <>
              <Loader2
                className="mr-1 inline size-3 animate-spin"
                aria-hidden="true"
              />
              Sending…
            </>
          ) : (
            <>
              <RefreshCw
                className="mr-1 inline size-3"
                aria-hidden="true"
              />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </>
          )}
        </button>

        <button
          type="button"
          className="hover:underline disabled:opacity-50"
          onClick={onBack}
          disabled={isSubmitting || isResending}
        >
          Back
        </button>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || isResending || otp.length !== 6}
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? "Verifying…" : verifyLabel}
      </Button>
    </form>
  );
}
