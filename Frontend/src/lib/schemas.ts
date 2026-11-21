
import { z } from "zod";

/**
 * Shared validation schemas.
 * Backend validation remains authoritative; these schemas provide
 * immediate client-side feedback.
 */

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^A-Za-z0-9]/, "Include at least one special character");

/**
 * Login accepts either an email address or an Indian mobile number.
 * The property remains named "email" for compatibility with the
 * existing login form and authentication service.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email or mobile number")
    .refine(
      (value) =>
        z.string().email().safeParse(value).success ||
        /^[6-9]\d{9}$/.test(value),
      "Enter a valid email or 10-digit mobile number"
    ),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email"),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type SignupValues = z.infer<typeof signupSchema>;

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  familyGothra: z.string().trim().optional(),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)"),
});

export type ContactValues = z.infer<typeof contactSchema>;

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the six-digit code"),
});

export type OtpValues = z.infer<typeof otpSchema>;

export const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
});

export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ResetValues = z.infer<typeof resetSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const familySchema = z.object({
  familyName: z.string().trim().min(2, "Family name is required"),
  referenceId: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^\d+$/.test(value),
      "Reference ID must contain numbers only"
    )
    .refine(
      (value) =>
        !value ||
        (Number.isSafeInteger(Number(value)) && Number(value) > 0),
      "Reference ID must be a positive whole number"
    ),
  nativePlace: z.string().trim().optional(),
});

export type FamilyValues = z.infer<typeof familySchema>;

export const personSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  fatherName: z.string().trim().optional(),
  motherName: z.string().trim().optional(),
  gender: z
    .union([z.literal(""), z.enum(["male", "female"])])
    .refine((v) => v !== "", { message: "Select a gender" }),
  dob: z.string().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        if (!/^\+?[0-9][0-9\s().-]*$/.test(value)) return false;

        const digitCount = value.replace(/\D/g, "").length;
        return digitCount >= 6 && digitCount <= 15;
      },
      "Enter a valid phone number containing 6–15 digits"
    ),
  mobile: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[6-9]\d{9}$/.test(v),
      "Enter a valid 10-digit Indian mobile number starting with 6–9"
    ),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Enter a valid email"
    ),
  originalNative: z.string().trim().optional(),
  currentAddress: z.string().trim().optional(),
});

export type PersonFormValues = z.infer<typeof personSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const addAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: passwordSchema,
  role: z.enum(["user", "admin"]),
});

export type AddAccountValues = z.infer<typeof addAccountSchema>;
