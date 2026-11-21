
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ShieldUser, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField, PasswordRuleChecklist } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/ui/motion";
import { PasswordInput } from "@/components/ui/password-input";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { addAccountSchema, type AddAccountValues } from "@/lib/schemas";
import { api, type ApiResponse } from "@/lib/api-client";

interface CreatedAccount {
  id: number | string;
  fullName: string;
  email: string;
  phone: string;
  role: "Admin" | "User";
  status: "Created" | "Pending OTP verification";
}

interface CreateAdminResponse {
  admin: {
    userId: number;
    userName: string;
    email: string;
    phone: string;
    role: "Admin";
  };
}

interface RegisterUserResponse {
  userId: number;
  email: string;
}

export function AddUserPage() {
  const [recent, setRecent] = useState<CreatedAccount[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddAccountValues>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
      password: "",
      role: "user",
    },
  });

  const role = watch("role");

  async function onSubmit(values: AddAccountValues) {
    const accountRole = values.role === "admin" ? "Admin" : "User";

    const payload = {
      userName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.mobile.trim(),
      password: values.password,
    };

    try {
      if (accountRole === "Admin") {
        // Admin creation requires an authenticated Admin account.
        const response = await api.post<
          ApiResponse<CreateAdminResponse>
        >("/admin/create", payload);

        const admin = response.data?.admin;

        if (!admin) {
          throw new Error(
            "The server did not return the created admin account.",
          );
        }

        setRecent((current) => [
          {
            id: admin.userId,
            fullName: admin.userName,
            email: admin.email,
            phone: admin.phone,
            role: "Admin",
            status: "Created",
          },
          ...current,
        ]);

        toast.success("Admin account created", {
          description: `${admin.userName} can now sign in.`,
        });
      } else {
        // User registration starts the OTP verification process.
        const response = await api.post<
          ApiResponse<RegisterUserResponse>
        >("/auth/register", payload);

        const user = response.data;

        if (!user?.userId) {
          throw new Error(
            "The server did not return the registered user details.",
          );
        }

        setRecent((current) => [
          {
            id: user.userId,
            fullName: values.fullName.trim(),
            email: user.email,
            phone: values.mobile.trim(),
            role: "User",
            status: "Pending OTP verification",
          },
          ...current,
        ]);

        toast.success("User registration started", {
          description: `An OTP verification step is required for ${user.email}.`,
        });
      }

      reset({
        fullName: "",
        email: "",
        mobile: "",
        password: "",
        role: "user",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the account.",
      );
    }
  }

  return (
    <PageFade>
      <PageHeader
        title="Add Admin/User"
        description="Create administrator accounts or register new users using the backend."
        breadcrumbs={[{ label: "Add Admin/User" }]}
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Create account form */}
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                label="Full Name"
                htmlFor="au-name"
                required
                error={errors.fullName?.message}
              >
                <Input
                  id="au-name"
                  placeholder="e.g. Aditi Kamath"
                  autoComplete="name"
                  {...register("fullName")}
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="au-email"
                required
                error={errors.email?.message}
              >
                <Input
                  id="au-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </FormField>

              <FormField
                label="Mobile Number"
                htmlFor="au-mobile"
                required
                error={errors.mobile?.message}
              >
                <Input
                  id="au-mobile"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  autoComplete="tel"
                  {...register("mobile")}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="au-password"
                required
                error={errors.password?.message}
              >
                <PasswordInput
                  id="au-password"
                  autoComplete="new-password"
                  {...register("password")}
                />

                <PasswordRuleChecklist
                  value={watch("password") ?? ""}
                />
              </FormField>

              <FormField
                label="Role"
                htmlFor="au-role"
                required
                error={errors.role?.message}
              >
                <SearchableSelect
                  id="au-role"
                  value={role}
                  onChange={(value) =>
                    setValue(
                      "role",
                      (value || "user") as "user" | "admin",
                      { shouldValidate: true },
                    )
                  }
                  options={[
                    { value: "user", label: "User" },
                    { value: "admin", label: "Admin" },
                  ]}
                  placeholder="Select role…"
                />
              </FormField>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}

                  {isSubmitting ? "Creating…" : "Create Account"}
                </Button>

                <Button type="button" variant="outline" asChild>
                  <Link to="/app">Cancel</Link>
                </Button>
              </div>
            </form>

            <div className="mt-5 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <p>
                <strong>Admin:</strong> Created directly as a verified
                administrator. Only an authenticated Admin can create
                another Admin.
              </p>

              <p>
                <strong>User:</strong> Registration starts the OTP
                verification process. The user must verify their email
                before completing registration.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accounts created during this page session */}
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Users
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                Recently created accounts
              </h2>

              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                {recent.length}
              </span>
            </div>

            {recent.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <ShieldUser className="mx-auto size-8 text-muted-foreground" />

                <p className="mt-3 text-sm font-semibold">
                  No accounts created yet
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Accounts created through this form will appear here
                  during the current page session.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {recent.map((account) => (
                  <li
                    key={`${account.role}-${account.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {account.fullName}
                      </span>

                      <span className="block truncate text-xs text-muted-foreground">
                        {account.email}
                      </span>

                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {account.status}
                      </span>
                    </span>

                    <span
                      className={
                        account.role === "Admin"
                          ? "shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold"
                          : "shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground"
                      }
                    >
                      {account.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              This list contains only accounts created during the current
              page session. A backend account-list endpoint is needed to
              retrieve all existing accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageFade>
  );
}
