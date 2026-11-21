import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { FadeIn } from "@/components/ui/motion";
import { Input } from "@/components/ui/input";
import { contactSchema, type ContactValues } from "@/lib/schemas";
import { siteConfig } from "@/mocks/data";

const DETAILS = [
  { icon: MapPin, label: "Location", value: siteConfig.location },
  { icon: Mail, label: "Email", value: siteConfig.email },
  { icon: Phone, label: "Phone", value: siteConfig.phone },
];

/**
 * Frontend-demo contact form: validates and shows a success toast but does
 * NOT send an actual email — no email backend exists in the prototype.
 */
export function ContactPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { fullName: "", email: "", familyGothra: "", message: "" },
  });

  async function onSubmit() {
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Message received — thank you!", {
      description: "Demo mode: no email was actually sent.",
    });
    setSent(true);
    reset();
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-wide text-foreground sm:text-5xl">
          Contact us
        </h1>
        <p className="mt-4 text-muted-foreground">
          Questions about your family's records, a demo walkthrough, or feedback — we'd love to
          hear from you.
        </p>
      </FadeIn>

      <div className="mt-10 grid gap-6 lg:grid-cols-[340px_1fr]">
        <FadeIn className="space-y-4">
          {DETAILS.map((d) => (
            <Card key={d.label} className="shadow-soft">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <d.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {d.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{d.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
                <FormField label="Full Name" htmlFor="contact-name" required error={errors.fullName?.message}>
                  <Input id="contact-name" placeholder="Your name" {...register("fullName")} />
                </FormField>
                <FormField label="Email" htmlFor="contact-email" required error={errors.email?.message}>
                  <Input id="contact-email" type="email" placeholder="name@example.com" {...register("email")} />
                </FormField>
                <FormField
                  label="Family / Gothra (optional)"
                  htmlFor="contact-family"
                  className="sm:col-span-2"
                  error={errors.familyGothra?.message}
                >
                  <Input id="contact-family" placeholder="e.g. Rao Family / Kashyapa" {...register("familyGothra")} />
                </FormField>
                <FormField label="Message" htmlFor="contact-message" required className="sm:col-span-2" error={errors.message?.message}>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("message")}
                  />
                </FormField>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {isSubmitting ? "Sending…" : "Send message"}
                  </Button>
                  {sent && (
                    <p className="text-sm font-medium text-success" role="status">
                      Thank you — your message was recorded in demo mode.
                    </p>
                  )}
                </div>
              </form>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                Demo mode — this form validates input and shows feedback, but does not send an
                actual email.
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
