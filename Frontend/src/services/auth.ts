
import {
  api,
  tokenStorage,
  ApiError,
  type ApiResponse,
} from "@/lib/api-client";

import type { Role, Session } from "@/types";
import { resetDemoData } from "@/services/data";

// ======================================================
// STORAGE CONFIGURATION
// ======================================================

const SESSION_KEY = "vv.auth.session";

type BackendRole = "Admin" | "User";

interface BackendUser {
  userId: number | string;
  userName: string;
  email: string;
  phone: string | null;
  role: BackendRole;
}

interface LoginResponse {
  token: string;
  user: BackendUser;
}

interface UserResponse {
  user: BackendUser;
}

interface RegisterResponse {
  userId: number | string;
  email: string;
}

interface AdminEmailChangeRequestData {
  requestId: number | string;
  email: string;
  expiryMinutes: number;
  resendAfterSeconds: number;
}

interface AdminEmailChangeVerifyData {
  userId: number | string;
  email: string;
}

type OtpPurpose = "signup" | "forgot";

let pendingOtp: {
  email: string;
  purpose: OtpPurpose;
} | null = null;

let signupOtpVerified = false;
let verifiedResetOtp: string | null = null;

// ======================================================
// SESSION HELPERS
// ======================================================

function mapBackendRole(role: BackendRole): Role {
  if (role === "Admin") {
    return "admin";
  }

  if (role === "User") {
    return "user";
  }

  throw new Error(
    "The server returned an unsupported user role."
  );
}

function mapBackendUser(
  user: BackendUser,
  signedInAt = new Date().toISOString()
): Session {
  return {
    userId: String(user.userId),
    fullName: user.userName,
    email: user.email,
    mobile: user.phone ?? "",
    role: mapBackendRole(user.role),
    signedInAt,
  };
}

function readSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  // A cached user session without a JWT is not authenticated.
  if (!tokenStorage.get()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (session) {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
      );
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    throw new Error(
      "Unable to save the user session."
    );
  }
}

function clearSession(): void {
  tokenStorage.clear();
  writeSession(null);
}

// ======================================================
// RESPONSE HELPER
// ======================================================

function getResponseData<T>(
  response: ApiResponse<T>
): T {
  if (
    !response.success ||
    response.data === undefined
  ) {
    throw new Error(
      response.message ||
        "The server returned an invalid response."
    );
  }

  return response.data;
}

// ======================================================
// GET CURRENT SESSION
// ======================================================

export function getSession(): Session | null {
  return readSession();
}

// ======================================================
// LOGIN
// ======================================================

export async function signIn(
  identifier: string,
  password: string
): Promise<Session> {
  const response = await api.post<
    ApiResponse<LoginResponse>
  >(
    "/auth/login",
    {
      identifier: identifier.trim(),
      password,
    },
    {
      auth: false,
    }
  );

  const result = getResponseData(response);

  if (!result.token || !result.user) {
    throw new Error(
      "Invalid login response received from server."
    );
  }

  const session = mapBackendUser(result.user);

  // Save JWT before saving the session.
  tokenStorage.set(result.token);

  try {
    writeSession(session);
  } catch (error) {
    clearSession();
    throw error;
  }

  return session;
}

// ======================================================
// LOGOUT
// ======================================================

export function signOut(): void {
  clearSession();

  pendingOtp = null;
  signupOtpVerified = false;
  verifiedResetOtp = null;
}

// ======================================================
// REGISTER
// ======================================================

export async function signUp(input: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}): Promise<void> {
  const response = await api.post<
    ApiResponse<RegisterResponse>
  >(
    "/auth/register",
    {
      userName: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.mobile.trim(),
      password: input.password,
    },
    {
      auth: false,
    }
  );

  getResponseData(response);

  // Store the email for the shared OTP panel.
  pendingOtp = {
    email: input.email.trim().toLowerCase(),
    purpose: "signup",
  };

  signupOtpVerified = false;
  verifiedResetOtp = null;
}

// ======================================================
// VERIFY OTP
// ======================================================

export async function verifyOtp(
  code: string
): Promise<boolean> {
  if (!pendingOtp) {
    throw new Error(
      "Verification session not found. Please restart the verification process."
    );
  }

  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const { email, purpose } = pendingOtp;

  if (purpose === "signup") {
    const response = await api.post<
      ApiResponse<{ email: string }>
    >(
      "/auth/verify-otp",
      {
        email,
        otp: code,
      },
      {
        auth: false,
      }
    );

    getResponseData(response);

    signupOtpVerified = true;

    return true;
  }

  const response = await api.post<ApiResponse>(
    "/auth/verify-reset-otp",
    {
      email,
      otp: code,
    },
    {
      auth: false,
    }
  );

  if (!response.success) {
    throw new Error(
      response.message || "OTP verification failed."
    );
  }

  verifiedResetOtp = code;

  return true;
}

// ======================================================
// COMPLETE SIGNUP
// ======================================================

export async function completeSignUp(input: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}): Promise<void> {
  // Registration and account creation already happened
  // on the backend. OTP verification activates the account.

  if (
    !signupOtpVerified ||
    !pendingOtp ||
    pendingOtp.purpose !== "signup"
  ) {
    throw new Error(
      "Please verify your signup OTP first."
    );
  }

  if (
    pendingOtp.email !==
    input.email.trim().toLowerCase()
  ) {
    throw new Error(
      "The verified email does not match the signup email."
    );
  }

  signupOtpVerified = false;
  pendingOtp = null;
}

// ======================================================
// RESEND OTP
// ======================================================

export async function resendOtp(): Promise<void> {
  if (!pendingOtp) {
    throw new Error(
      "No active OTP verification session."
    );
  }

  const { email, purpose } = pendingOtp;

  if (purpose === "signup") {
    const response = await api.post<ApiResponse>(
      "/auth/resend-otp",
      { email },
      { auth: false }
    );

    if (!response.success) {
      throw new Error(
        response.message || "Unable to resend OTP."
      );
    }

    return;
  }

  // The current backend does not expose a separate
  // forgot-password resend endpoint.
  // Requesting another reset OTP uses this endpoint.

  const response = await api.post<ApiResponse>(
    "/auth/forgot-password",
    { email },
    { auth: false }
  );

  if (!response.success) {
    throw new Error(
      response.message || "Unable to resend OTP."
    );
  }

  verifiedResetOtp = null;
}

// ======================================================
// FORGOT PASSWORD
// ======================================================

export async function requestPasswordReset(
  email: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  const response = await api.post<ApiResponse>(
    "/auth/forgot-password",
    {
      email: normalizedEmail,
    },
    {
      auth: false,
    }
  );

  if (!response.success) {
    throw new Error(
      response.message ||
        "Unable to request password reset."
    );
  }

  pendingOtp = {
    email: normalizedEmail,
    purpose: "forgot",
  };

  verifiedResetOtp = null;
  signupOtpVerified = false;
}

// ======================================================
// RESET PASSWORD
// ======================================================

export async function resetPassword(
  email: string,
  newPassword: string
): Promise<void> {
  if (
    !verifiedResetOtp ||
    !pendingOtp ||
    pendingOtp.purpose !== "forgot"
  ) {
    throw new Error(
      "Please verify your password reset OTP first."
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== pendingOtp.email) {
    throw new Error(
      "The verified email does not match."
    );
  }

  const response = await api.post<ApiResponse>(
    "/auth/reset-password",
    {
      email: normalizedEmail,
      otp: verifiedResetOtp,
      newPassword,
    },
    {
      auth: false,
    }
  );

  if (!response.success) {
    throw new Error(
      response.message ||
        "Unable to reset password."
    );
  }

  pendingOtp = null;
  verifiedResetOtp = null;
}

// ======================================================
// CHANGE PASSWORD
// ======================================================

export async function changePassword(
  _session: Session,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await api.patch<ApiResponse>(
    "/users/change-password",
    {
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    }
  );

  if (!response.success) {
    throw new Error(
      response.message || "Unable to change password."
    );
  }
}

// ======================================================
// UPDATE PROFILE
// ======================================================

export async function updateProfile(
  session: Session,
  input: {
    fullName: string;
    mobile: string;
  }
): Promise<Session> {
  const response = await api.put<
    ApiResponse<UserResponse>
  >(
    "/users/me",
    {
      userName: input.fullName.trim(),
      phone: input.mobile.trim(),
    }
  );

  const updatedUser = getResponseData(response).user;

  const updatedSession = mapBackendUser(
    updatedUser,
    session.signedInAt
  );

  writeSession(updatedSession);

  return updatedSession;
}

// ======================================================
// ADMIN EMAIL CHANGE
// ======================================================

// Ensure the current authenticated session
// belongs to an Admin.
//
// Backend authentication and Admin authorization
// are also enforced independently.

function requireAdminSession(): Session {
  const session = readSession();

  if (!session) {
    throw new Error(
      "Your session has expired. Please sign in again."
    );
  }

  if (session.role !== "admin") {
    throw new Error(
      "Only Admin accounts can change their email address."
    );
  }

  return session;
}

// ======================================================
// 1. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
// ======================================================

export async function requestAdminEmailChange(
  newEmail: string,
  currentPassword: string
): Promise<AdminEmailChangeRequestData> {
  const session = requireAdminSession();

  const normalizedEmail = newEmail.trim().toLowerCase();

  if (
    !normalizedEmail ||
    normalizedEmail.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    )
  ) {
    throw new Error(
      "Please enter a valid email address."
    );
  }

  if (
    normalizedEmail ===
    session.email.trim().toLowerCase()
  ) {
    throw new Error(
      "The new email address must be different from your current email."
    );
  }

  if (!currentPassword) {
    throw new Error(
      "Please enter your current password."
    );
  }

  const response = await api.post<
    ApiResponse<AdminEmailChangeRequestData>
  >(
    "/admin/email-change/request",
    {
      newEmail: normalizedEmail,
      currentPassword,
    }
  );

  return getResponseData(response);
}

// ======================================================
// 2. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
// ======================================================

export async function resendAdminEmailChangeOtp():
  Promise<AdminEmailChangeRequestData> {

  requireAdminSession();

  const response = await api.post<
    ApiResponse<AdminEmailChangeRequestData>
  >(
    "/admin/email-change/resend"
  );

  return getResponseData(response);
}

// ======================================================
// 3. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
// ======================================================

export async function verifyAdminEmailChangeOtp(
  otp: string
): Promise<Session> {
  const currentSession = requireAdminSession();

  const normalizedOtp = otp.trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw new Error(
      "Please enter the six-digit verification code."
    );
  }

  const response = await api.post<
    ApiResponse<AdminEmailChangeVerifyData>
  >(
    "/admin/email-change/verify",
    {
      otp: normalizedOtp,
    }
  );

  const result = getResponseData(response);

  const returnedUserId = String(result.userId);

  const returnedEmail = result.email
    ?.trim()
    .toLowerCase();

  // Ensure that the backend updated the currently
  // authenticated Admin account.

  if (returnedUserId !== currentSession.userId) {
    throw new Error(
      "The updated account does not match the current Admin session."
    );
  }

  if (!returnedEmail) {
    throw new Error(
      "The server did not return the updated email address."
    );
  }

  // Update local session only after successful
  // verification and backend email update.

  const updatedSession: Session = {
    ...currentSession,
    email: returnedEmail,
  };

  writeSession(updatedSession);

  return updatedSession;
}

// ======================================================
// EXPORT EXISTING DEMO RESET HELPER
// ======================================================

export { resetDemoData };
export { ApiError };
