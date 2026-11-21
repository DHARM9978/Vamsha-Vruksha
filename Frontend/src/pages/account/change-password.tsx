import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField, PasswordRuleChecklist } from "@/components/ui/form-field";
import { PageFade } from "@/components/ui/motion";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/schemas";
import { changePassword } from "@/services/auth";
import type { Session } from "@/types";

export function ChangePasswordPage({ session }: { session: Session }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema) as never,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    try {
      await changePassword(session, values.currentPassword, values.newPassword);
      toast.success("Password changed", {
        description: "Demo mode: the mock account's password was updated. Nothing was sent to a server.",
      });
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the password.");
    }
  }

  return (
    <PageFade>
      <PageHeader
        title="Change Password"
        description="Update the password for your demo account."
        breadcrumbs={[{ label: "Change Password" }]}
      />

      <Card className="max-w-md shadow-soft">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              label="Current Password"
              htmlFor="cp-current"
              required
              error={errors.currentPassword?.message}
            >
              <PasswordInput id="cp-current" autoComplete="current-password" {...register("currentPassword")} />
            </FormField>
            <FormField label="New Password" htmlFor="cp-new" required error={errors.newPassword?.message}>
              <PasswordInput id="cp-new" autoComplete="new-password" {...register("newPassword")} />
              <PasswordRuleChecklist value={watch("newPassword") ?? ""} />
            </FormField>
            <FormField
              label="Confirm New Password"
              htmlFor="cp-confirm"
              required
              error={errors.confirmPassword?.message}
            >
              <PasswordInput id="cp-confirm" autoComplete="new-password" {...register("confirmPassword")} />
            </FormField>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
          <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
            Demo only — the password policy (8+ characters, uppercase, number, special character)
            matches the one used across Sign Up and Reset Password; no stored password is actually
            secured here.
          </p>
        </CardContent>
      </Card>
    </PageFade>
  );
}
