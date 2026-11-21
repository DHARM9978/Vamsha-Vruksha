import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CulturalFields,
  type MasterOptions,
} from "@/components/shared/person-fields";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/ui/motion";

import {
  familySchema,
  personSchema,
} from "@/lib/schemas";

import { api, type ApiResponse } from "@/lib/api-client";

import type {
  CulturalAttributes,
  MasterKey,
} from "@/types";

// ------------------------------------------------------------
// CREATE FAMILY VALIDATION
//
// Phone and Mobile:
// - Optional fields.
// - Digits only.
// - Maximum 10 digits.
//
// Email:
// - Optional field.
// - Must be a valid email format when entered.
// - Is converted to lowercase while typing and before submission.
// ------------------------------------------------------------

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^\d{6,10}$/.test(value),
    "Phone must contain digits only and be between 6 and 10 digits."
  );

const optionalMobileSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[6-9]\d{9}$/.test(value),
    "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9."
  );

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      !value || z.string().email().safeParse(value).success,
    "Enter a valid email address, for example name@example.com."
  );

const createFamilySchema = familySchema.merge(personSchema).extend({
  phone: optionalPhoneSchema,
  mobile: optionalMobileSchema,
  email: optionalEmailSchema,
});

// Use the INPUT type because gender can initially be an empty string.
type CreateFamilyValues = z.input<typeof createFamilySchema>;

interface BackendMaster {
  id: number | string;
  name: string;
}

const MASTER_ENDPOINTS: Record<MasterKey, string> = {
  gotra: "gotra",
  sutra: "sutra",
  vamsha: "vamsha",
  kula_devatha: "kula-devatha",
  mane_devru: "mane-devru",
  panchang_sudhi: "panchang-sudhi",
  pooja_vruksha: "pooja-vruksha",
};

const MASTER_KEYS = Object.keys(
  MASTER_ENDPOINTS
) as MasterKey[];

const EMPTY_CULTURAL: CulturalAttributes = {
  gotra: "",
  sutra: "",
  panchangSudhi: "",
  vamsha: "",
  maneDevru: "",
  kulaDevatha: "",
  poojaVruksha: "",
};

function toOptionalId(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid heritage master selection.");
  }

  return id;
}

export function CreateFamilyPage() {
  const navigate = useNavigate();

  const [cultural, setCultural] =
    useState<CulturalAttributes>(EMPTY_CULTURAL);

  const [masterOptions, setMasterOptions] =
    useState<MasterOptions | null>(null);

  const [masterError, setMasterError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFamilyValues>({
    resolver: zodResolver(createFamilySchema) as never,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      familyName: "",
      referenceId: "",
      nativePlace: "",
      firstName: "",
      lastName: "",
      fatherName: "",
      motherName: "",
      gender: "",
      dob: "",
      phone: "",
      mobile: "",
      email: "",
      originalNative: "",
      currentAddress: "",
    },
  });

  // Register contact inputs separately so characters other than digits
  // are removed immediately and the user cannot enter more than 10 digits.
  const phoneRegistration = register("phone");
  const mobileRegistration = register("mobile");
  const emailRegistration = register("email");

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value
      .replace(/\D/g, "")
      .slice(0, 10);

    void phoneRegistration.onChange(event);
  };

  const handleMobileChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value
      .replace(/\D/g, "")
      .slice(0, 10);

    void mobileRegistration.onChange(event);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.toLowerCase();
    void emailRegistration.onChange(event);
  };

  // Load heritage master records from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadMasterOptions() {
      try {
        setMasterError("");

        const results = await Promise.all(
          MASTER_KEYS.map(async (key) => {
            const endpoint = MASTER_ENDPOINTS[key];

            const response = await api.get<
              ApiResponse<BackendMaster[]>
            >(`/masters/${endpoint}`);

            if (
              !response.success ||
              !Array.isArray(response.data)
            ) {
              throw new Error(
                response.message ||
                  `Unable to load ${endpoint} records.`
              );
            }

            return {
              key,
              options: response.data.map((item) => ({
                value: String(item.id),
                label: item.name,
              })),
            };
          })
        );

        if (cancelled) return;

        const options = {} as MasterOptions;

        results.forEach((result) => {
          options[result.key] = result.options;
        });

        setMasterOptions(options);
      } catch (error) {
        if (cancelled) return;

        setMasterError(
          error instanceof Error
            ? error.message
            : "Unable to load heritage master data."
        );
      }
    }

    void loadMasterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: CreateFamilyValues) {
    try {
      // Zod validates gender before this handler runs.
      if (
        values.gender !== "male" &&
        values.gender !== "female"
      ) {
        toast.error("Please select a gender.");
        return;
      }

      const gotraId = toOptionalId(cultural.gotra);

      if (!gotraId) {
        toast.error("Please select a Gotra.");
        return;
      }

      // Keep a final defensive check before sending data to the API.
      const phone = values.phone?.trim() || "";
      const mobile = values.mobile?.trim() || "";
      const email = values.email?.trim().toLowerCase() || "";

      if (phone && !/^\d{6,10}$/.test(phone)) {
        toast.error("Phone must contain digits only and be between 6 and 10 digits.");
        return;
      }

      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        toast.error("Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.");
        return;
      }

      if (email && !z.string().email().safeParse(email).success) {
        toast.error("Please enter a valid email address.");
        return;
      }

      const payload = {
        family: {
          familyName: values.familyName.trim(),
          referenceId: values.referenceId?.trim()
            ? Number(values.referenceId.trim())
            : null,
          nativePlace: values.nativePlace?.trim() || "",
          headDob: values.dob || "",
          gotraId,
        },

        headPerson: {
          firstName: values.firstName.trim(),
          lastName: values.lastName?.trim() || "",
          fatherName: values.fatherName?.trim() || "",
          motherName: values.motherName?.trim() || "",
          gender: values.gender,
          dob: values.dob || "",
          phoneNumber: phone,
          mobileNumber: mobile,
          email,
          originalNative:
            values.originalNative?.trim() || "",
          currentAddress:
            values.currentAddress?.trim() || "",

          gotraId,
          sutraId: toOptionalId(cultural.sutra),
          panchangSudhiId: toOptionalId(
            cultural.panchangSudhi
          ),
          vamshaId: toOptionalId(cultural.vamsha),
          maneDevruId: toOptionalId(cultural.maneDevru),
          kulaDevathaId: toOptionalId(cultural.kulaDevatha),
          poojaVrukshaId: toOptionalId(cultural.poojaVruksha),
        },
      };

      const response = await api.post<
        ApiResponse<{ family: unknown }>
      >("/families", payload);

      if (!response.success) {
        throw new Error(
          response.message || "Unable to create family."
        );
      }

      const referenceId = values.referenceId?.trim();

      toast.success("Family created successfully", {
        description: referenceId
          ? `${values.familyName} (Ref ${referenceId}) has been saved.`
          : `${values.familyName} has been saved.`,
      });

      await navigate({ to: "/app" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the family."
      );
    }
  }

  return (
    <PageFade>
      <PageHeader
        title="Create Family"
        description="Register a new family with its head person and heritage details."
        breadcrumbs={[{ label: "Create Family" }]}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Family information */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              Family information
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Family Name"
              htmlFor="fam-name"
              required
              error={errors.familyName?.message}
            >
              <Input
                id="fam-name"
                placeholder="e.g. Rao Family"
                {...register("familyName")}
              />
            </FormField>

            <FormField
              label="Reference ID"
              htmlFor="fam-ref"
              hint="Optional — enter a positive whole number if available"
              error={errors.referenceId?.message}
            >
              <Input
                id="fam-ref"
                inputMode="numeric"
                placeholder="e.g. 1006"
                {...register("referenceId")}
              />
            </FormField>

            <FormField
              label="Native Place"
              htmlFor="fam-native"
              className="sm:col-span-2"
              error={errors.nativePlace?.message}
            >
              <Input
                id="fam-native"
                placeholder="e.g. Kasaragod, Kerala"
                {...register("nativePlace")}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Head person details */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              Head person details
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="First Name"
              htmlFor="head-firstName"
              required
              error={errors.firstName?.message}
            >
              <Input
                id="head-firstName"
                placeholder="e.g. Arjun"
                {...register("firstName")}
              />
            </FormField>

            <FormField
              label="Last Name"
              htmlFor="head-lastName"
              error={errors.lastName?.message}
            >
              <Input
                id="head-lastName"
                placeholder="e.g. Rao"
                {...register("lastName")}
              />
            </FormField>

            <FormField
              label="Father Name"
              htmlFor="head-fatherName"
              error={errors.fatherName?.message}
            >
              <Input
                id="head-fatherName"
                placeholder="Father's full name"
                {...register("fatherName")}
              />
            </FormField>

            <FormField
              label="Mother Name"
              htmlFor="head-motherName"
              error={errors.motherName?.message}
            >
              <Input
                id="head-motherName"
                placeholder="Mother's full name"
                {...register("motherName")}
              />
            </FormField>

            <FormField
              label="Gender"
              htmlFor="head-gender"
              required
              error={errors.gender?.message}
            >
              <select
                id="head-gender"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("gender")}
              >
                <option value="">Select gender…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </FormField>

            <FormField
              label="Date of Birth"
              htmlFor="head-dob"
              error={errors.dob?.message}
            >
              <Input
                id="head-dob"
                type="date"
                {...register("dob")}
              />
            </FormField>

            <FormField
              label="Phone"
              htmlFor="head-phone"
              hint="Digits only; enter 6 to 10 digits."
              error={errors.phone?.message}
            >
              <Input
                id="head-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{1,10}"
                placeholder="Enter phone number"
                autoComplete="off"
                {...phoneRegistration}
                onChange={handlePhoneChange}
              />
            </FormField>

            <FormField
              label="Mobile"
              htmlFor="head-mobile"
              hint="Enter exactly 10 digits; must start with 6, 7, 8 or 9."
              error={errors.mobile?.message}
            >
              <Input
                id="head-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{1,10}"
                placeholder="e.g. 9876543210"
                autoComplete="off"
                {...mobileRegistration}
                onChange={handleMobileChange}
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="head-email"
              hint="Email is automatically converted to lowercase."
              error={errors.email?.message}
            >
              <Input
                id="head-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="name@example.com"
                {...emailRegistration}
                onChange={handleEmailChange}
              />
            </FormField>

            <FormField
              label="Original Native"
              htmlFor="head-originalNative"
              error={errors.originalNative?.message}
            >
              <Input
                id="head-originalNative"
                placeholder="Ancestral town/village"
                {...register("originalNative")}
              />
            </FormField>

            <FormField
              label="Current Address"
              htmlFor="head-currentAddress"
              className="sm:col-span-2"
              error={errors.currentAddress?.message}
            >
              <Input
                id="head-currentAddress"
                placeholder="Where they live today"
                {...register("currentAddress")}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Cultural and heritage details */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              Cultural & heritage details
            </CardTitle>
          </CardHeader>

          <CardContent>
            {masterError ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Unable to load heritage options
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {masterError}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : masterOptions ? (
              <CulturalFields
                value={cultural}
                onChange={(patch) =>
                  setCultural((current) => ({
                    ...current,
                    ...patch,
                  }))
                }
                options={masterOptions}
                idPrefix="fam-cultural"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link to="/app">Cancel</Link>
          </Button>

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !masterOptions ||
              Boolean(masterError)
            }
          >
            {isSubmitting && (
              <Loader2 className="size-4 animate-spin" />
            )}

            {isSubmitting
              ? "Creating…"
              : "Create Family"}
          </Button>
        </div>
      </form>
    </PageFade>
  );
}