
import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/ui/motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  requestAdminEmailChange,
  resendAdminEmailChangeOtp,
  verifyAdminEmailChangeOtp,
} from "@/services/auth";

import { profileSchema, type ProfileValues } from "@/lib/schemas";
import { api, type ApiResponse } from "@/lib/api-client";
import type { Session } from "@/types";

// ======================================================
// TYPES
// ======================================================

interface BackendUser {
  userId: number | string;
  userName: string;
  email: string;
  phone: string | null;
  role: "Admin" | "User";
  isVerified: boolean;
  createdAt: string;
}

interface UserProfileResponse {
  user: BackendUser;
}

type EmailChangeStep = "closed" | "request" | "verify";

// ======================================================
// MAP BACKEND USER TO FRONTEND SESSION
// ======================================================

function mapBackendUserToSession(
  user: BackendUser,
  currentSession: Session,
): Session {
  return {
    ...currentSession,
    userId: String(user.userId),
    fullName: user.userName,
    email: user.email,
    mobile: user.phone ?? "",
    role: user.role === "Admin" ? "admin" : "user",
  };
}

// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(value: string | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ======================================================
// PROFILE PAGE
// ======================================================

export function ProfilePage({
  session,
  onSessionChange,
}: {
  session: Session;
  onSessionChange: (session: Session) => void;
}) {
  // ----------------------------------------------------
  // PROFILE STATES
  // ----------------------------------------------------

  const [editing, setEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [createdAt, setCreatedAt] = useState<string | undefined>();

  // ----------------------------------------------------
  // ADMIN EMAIL CHANGE STATES
  // ----------------------------------------------------

  const [emailChangeStep, setEmailChangeStep] =
    useState<EmailChangeStep>("closed");

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [requestingEmailChange, setRequestingEmailChange] =
    useState(false);

  const [verifyingEmailChange, setVerifyingEmailChange] =
    useState(false);

  const [resendingEmailOtp, setResendingEmailOtp] =
    useState(false);

  const [resendSeconds, setResendSeconds] = useState(0);

  // ----------------------------------------------------
  // PROFILE FORM
  // ----------------------------------------------------

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),

    defaultValues: {
      fullName: session.fullName,
      mobile: session.mobile,
    },
  });

  // ====================================================
  // LOAD ADMIN / USER PROFILE
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await api.get<
          ApiResponse<UserProfileResponse>
        >("/users/me");

        const user = response.data?.user;

        if (!user) {
          throw new Error(
            "The server did not return your profile."
          );
        }

        if (cancelled) return;

        const updatedSession = mapBackendUserToSession(
          user,
          session,
        );

        onSessionChange(updatedSession);

        setCreatedAt(user.createdAt);

        reset({
          fullName: user.userName,
          mobile: user.phone ?? "",
        });

      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };

  }, [session.userId, onSessionChange, reset]);

  // ====================================================
  // OTP RESEND COUNTDOWN
  // ====================================================

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) =>
        Math.max(0, seconds - 1)
      );
    }, 1000);

    return () => window.clearTimeout(timer);

  }, [resendSeconds]);

  // ====================================================
  // PROFILE INITIALS
  // ====================================================

  const initials = session.fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  async function onSubmit(values: ProfileValues) {
    try {
      const response = await api.put<
        ApiResponse<UserProfileResponse>
      >(
        "/users/me",
        {
          userName: values.fullName.trim(),
          phone: values.mobile.trim(),
        }
      );

      const updatedUser = response.data?.user;

      if (!updatedUser) {
        throw new Error(
          "The server did not return the updated profile."
        );
      }

      const updatedSession = mapBackendUserToSession(
        updatedUser,
        session,
      );

      onSessionChange(updatedSession);

      setCreatedAt(updatedUser.createdAt);

      reset({
        fullName: updatedUser.userName,
        mobile: updatedUser.phone ?? "",
      });

      setEditing(false);

      toast.success("Profile updated", {
        description:
          "Your account details have been saved successfully.",
      });

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update your profile."
      );
    }
  }

  // ====================================================
  // CANCEL PROFILE EDITING
  // ====================================================

  function cancelEditing() {
    reset({
      fullName: session.fullName,
      mobile: session.mobile,
    });

    setEditing(false);
  }

  // ====================================================
  // RESET EMAIL CHANGE FORM STATE
  // ====================================================

  function closeEmailChangeRequest() {
    setEmailChangeStep("closed");

    setNewEmail("");
    setCurrentPassword("");
    setPendingEmail("");
    setOtp("");

    setResendSeconds(0);
  }

  // ====================================================
  // 1. REQUEST ADMIN EMAIL CHANGE
  // ====================================================

  async function handleRequestEmailChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (requestingEmailChange) return;

    setRequestingEmailChange(true);

    try {
      const result = await requestAdminEmailChange(
        newEmail,
        currentPassword,
      );

      setPendingEmail(result.email);

      // Clear password from frontend state.
      setCurrentPassword("");

      setOtp("");

      setResendSeconds(
        result.resendAfterSeconds ?? 60
      );

      setEmailChangeStep("verify");

      toast.success("Verification code sent", {
        description:
          `Check ${result.email} for the six-digit verification code.`,
      });

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not request an email change."
      );
    } finally {
      setRequestingEmailChange(false);
    }
  }

  // ====================================================
  // 2. RESEND ADMIN EMAIL CHANGE OTP
  // ====================================================

  async function handleResendEmailOtp() {
    if (
      resendSeconds > 0 ||
      resendingEmailOtp
    ) {
      return;
    }

    setResendingEmailOtp(true);

    try {
      const result = await resendAdminEmailChangeOtp();

      setPendingEmail(result.email);

      setOtp("");

      setResendSeconds(
        result.resendAfterSeconds ?? 60
      );

      toast.success(
        "A new verification code has been sent."
      );

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not resend the verification code."
      );
    } finally {
      setResendingEmailOtp(false);
    }
  }

  // ====================================================
  // 3. VERIFY ADMIN EMAIL CHANGE OTP
  // ====================================================

  async function handleVerifyEmailOtp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (verifyingEmailChange) return;

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error(
        "Enter the six-digit verification code."
      );

      return;
    }

    setVerifyingEmailChange(true);

    try {
      const updatedSession =
        await verifyAdminEmailChangeOtp(
          otp.trim()
        );

      // Update application session only after the backend
      // confirms successful OTP verification and DB update.

      onSessionChange(updatedSession);

      closeEmailChangeRequest();

      toast.success(
        "Admin email updated successfully",
        {
          description:
            `Your verified email is now ${updatedSession.email}.`,
        }
      );

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Email verification failed."
      );
    } finally {
      setVerifyingEmailChange(false);
    }
  }

  // ====================================================
  // RENDER PROFILE PAGE
  // ====================================================

  return (
    <PageFade>

      <PageHeader
        title="Profile"
        description={
          session.role === "admin"
            ? "Manage your account details and securely verify Admin email changes."
            : "Your account details. Email and role are read-only."
        }
        breadcrumbs={[{ label: "Profile" }]}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

        {/* ==========================================
            PROFILE SUMMARY
        ========================================== */}

        <Card className="shadow-soft">

          <CardContent className="flex flex-col items-center p-7 text-center">

            <Avatar className="size-20">
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>

            <h2 className="mt-4 text-lg font-bold">
              {session.fullName}
            </h2>

            <span className="mt-2 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground">
              {session.role === "admin" ? "Admin" : "User"}
            </span>

            <dl className="mt-5 w-full space-y-2 text-left text-sm">

              <div className="flex justify-between gap-3 rounded-lg px-3 py-2 odd:bg-muted/50">
                <dt className="text-muted-foreground">
                  Email
                </dt>

                <dd className="max-w-[65%] truncate font-semibold">
                  {session.email}
                </dd>
              </div>

              <div className="flex justify-between gap-3 rounded-lg px-3 py-2 odd:bg-muted/50">
                <dt className="text-muted-foreground">
                  Mobile
                </dt>

                <dd className="font-semibold">
                  {session.mobile || "—"}
                </dd>
              </div>

              <div className="flex justify-between gap-3 rounded-lg px-3 py-2 odd:bg-muted/50">
                <dt className="text-muted-foreground">
                  Member since
                </dt>

                <dd className="font-semibold">
                  {loadingProfile
                    ? "Loading…"
                    : formatDate(createdAt)}
                </dd>
              </div>

            </dl>

          </CardContent>

        </Card>

        {/* ==========================================
            PROFILE DETAILS AND EMAIL SECURITY
        ========================================== */}

        <div className="space-y-6">

          {/* ========================================
              EDIT PROFILE
          ======================================== */}

          <Card className="shadow-soft">

            <CardContent className="p-6">

              <div className="mb-4 flex items-center justify-between">

                <h2 className="text-base font-bold">
                  Edit details
                </h2>

                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingProfile}
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                )}

              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="grid max-w-md gap-4"
                noValidate
              >

                <FormField
                  label="Full Name"
                  htmlFor="profile-name"
                  required
                  error={errors.fullName?.message}
                >
                  <Input
                    id="profile-name"
                    disabled={!editing || loadingProfile}
                    autoComplete="name"
                    {...register("fullName")}
                  />
                </FormField>

                <FormField
                  label="Mobile"
                  htmlFor="profile-mobile"
                  required
                  hint={
                    editing
                      ? "Enter your mobile number using digits only."
                      : undefined
                  }
                  error={errors.mobile?.message}
                >
                  <Input
                    id="profile-mobile"
                    inputMode="numeric"
                    autoComplete="tel"
                    disabled={!editing || loadingProfile}
                    {...register("mobile")}
                  />
                </FormField>

                <FormField
                  label="Email address"
                  htmlFor="profile-email"
                  hint={
                    session.role === "admin"
                      ? "Use the secure email verification section below to change this address."
                      : "Email cannot be changed from this page."
                  }
                >
                  <Input
                    id="profile-email"
                    value={session.email}
                    readOnly
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                </FormField>

                {editing && (
                  <div className="flex gap-2">

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="size-4 animate-spin" />
                      )}

                      {isSubmitting ? "Saving…" : "Save"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>

                  </div>
                )}

              </form>

              <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
                Your name and mobile number are saved directly to your
                authenticated account. Email and role are protected
                from ordinary profile edits.
              </p>

            </CardContent>

          </Card>

          {/* ========================================
              ADMIN-ONLY EMAIL CHANGE
          ======================================== */}

          {session.role === "admin" && (

            <Card className="shadow-soft">

              <CardContent className="space-y-5 p-6">

                {/* Email security heading */}

                <div className="flex items-start gap-3">

                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">

                    <h2 className="text-base font-bold">
                      Admin email verification
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Change your Admin email address only after
                      verifying a one-time code sent to the new address.
                    </p>

                  </div>

                </div>

                {/* ==================================
                    INITIAL EMAIL CHANGE VIEW
                ================================== */}

                {emailChangeStep === "closed" && (

                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="text-xs font-medium text-muted-foreground">
                        Current verified email
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold">
                        {session.email}
                      </p>

                    </div>

                    <Button
                      type="button"
                      onClick={() =>
                        setEmailChangeStep("request")
                      }
                    >
                      <Mail className="size-4" />
                      Change email
                    </Button>

                  </div>

                )}

                {/* ==================================
                    REQUEST EMAIL CHANGE
                ================================== */}

                {emailChangeStep === "request" && (

                  <form
                    onSubmit={handleRequestEmailChange}
                    className="grid max-w-md gap-4"
                    noValidate
                  >

                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">

                      <p className="text-xs text-muted-foreground">
                        Current email
                      </p>

                      <p className="mt-1 break-all font-semibold">
                        {session.email}
                      </p>

                    </div>

                    <FormField
                      label="New email address"
                      htmlFor="admin-new-email"
                      required
                      hint="A six-digit verification code will be sent to this address."
                    >
                      <Input
                        id="admin-new-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your new email address"
                        value={newEmail}
                        onChange={(event) =>
                          setNewEmail(event.target.value)
                        }
                        maxLength={150}
                        required
                        disabled={requestingEmailChange}
                      />
                    </FormField>

                    <FormField
                      label="Current password"
                      htmlFor="admin-current-password"
                      required
                      hint="Confirm your identity before requesting the email change."
                    >
                      <Input
                        id="admin-current-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        required
                        disabled={requestingEmailChange}
                      />
                    </FormField>

                    <div className="flex flex-wrap gap-2">

                      <Button
                        type="submit"
                        disabled={
                          requestingEmailChange ||
                          !newEmail.trim() ||
                          !currentPassword
                        }
                      >
                        {requestingEmailChange ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Mail className="size-4" />
                        )}

                        {requestingEmailChange
                          ? "Sending code…"
                          : "Send verification code"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={requestingEmailChange}
                        onClick={closeEmailChangeRequest}
                      >
                        Cancel
                      </Button>

                    </div>

                  </form>

                )}

                {/* ==================================
                    VERIFY OTP
                ================================== */}

                {emailChangeStep === "verify" && (

                  <form
                    onSubmit={handleVerifyEmailOtp}
                    className="grid max-w-md gap-4"
                    noValidate
                  >

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">

                      <div className="flex items-center gap-2 text-sm font-semibold">

                        <CheckCircle2 className="size-4 text-primary" />

                        Verification code sent

                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        Enter the six-digit code sent to:
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold">
                        {pendingEmail}
                      </p>

                      <p className="mt-2 text-xs text-muted-foreground">
                        The code expires in 5 minutes. Your current
                        email will not change until verification succeeds.
                      </p>

                    </div>

                    <FormField
                      label="Six-digit verification code"
                      htmlFor="admin-email-otp"
                      required
                      hint="Enter the code from the email you received."
                    >
                      <Input
                        id="admin-email-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        value={otp}
                        onChange={(event) =>
                          setOtp(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6)
                          )
                        }
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                        disabled={verifyingEmailChange}
                        className="max-w-[220px] text-center text-lg font-semibold tracking-[0.35em]"
                      />
                    </FormField>

                    <div className="flex flex-wrap gap-2">

                      {/* VERIFY BUTTON */}

                      <Button
                        type="submit"
                        disabled={
                          verifyingEmailChange ||
                          otp.trim().length !== 6
                        }
                      >
                        {verifyingEmailChange ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <KeyRound className="size-4" />
                        )}

                        {verifyingEmailChange
                          ? "Verifying…"
                          : "Verify and change email"}
                      </Button>

                      {/* RESEND OTP BUTTON */}

                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          resendingEmailOtp ||
                          resendSeconds > 0
                        }
                        onClick={() =>
                          void handleResendEmailOtp()
                        }
                      >
                        {resendingEmailOtp ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}

                        {resendingEmailOtp
                          ? "Resending…"
                          : resendSeconds > 0
                            ? `Resend in ${resendSeconds}s`
                            : "Resend code"}
                      </Button>

                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">

                      <p className="text-xs text-muted-foreground">
                        Need to use a different address? Start a new request.
                      </p>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={
                          verifyingEmailChange ||
                          resendingEmailOtp
                        }
                        onClick={() => {
                          setOtp("");
                          setNewEmail("");
                          setEmailChangeStep("request");
                        }}
                      >
                        Use a different email
                      </Button>

                    </div>

                  </form>

                )}

              </CardContent>

            </Card>

          )}

        </div>

      </div>

    </PageFade>
  );
}
