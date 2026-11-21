
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Search, X, AlertCircle, RefreshCw } from "lucide-react";

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
  PersonalFields,
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

import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

// Contact validation follows the Create Family rules.
// Phone: optional, digits only, 6–10 digits.
// Mobile: optional, exactly 10 digits, starting with 6–9.
// Email: optional, but must be a valid email format when entered.
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
    (value) => !value || z.string().email().safeParse(value).success,
    "Enter a valid email address, for example name@example.com."
  );

const editFamilySchema = familySchema.merge(personSchema).extend({
  phone: optionalPhoneSchema,
  mobile: optionalMobileSchema,
  email: optionalEmailSchema,
});

type EditFamilyValues = z.input<typeof editFamilySchema>;

interface BackendMaster {
  id: number | string;
  name: string;
}

interface BackendFamily {
  familyId: number | string;
  referenceId: number | string | null;
  familyName: string;
  nativePlace: string | null;
  headDob?: string | null;
  gotraId: number | string | null;
  gotraName?: string | null;
  totalMembers?: number;
  headPersonName?: string | null;
}

interface BackendHeadPerson {
  personId: number | string;
  firstName: string;
  lastName: string | null;
  fatherName: string | null;
  motherName: string | null;
  gender: "male" | "female";
  dob: string | null;
  phoneNumber: string | null;
  mobileNumber: string | null;
  email: string | null;
  originalNative: string | null;
  currentAddress: string | null;
  gotraId: number | string | null;
  sutraId: number | string | null;
  panchangSudhiId: number | string | null;
  vamshaId: number | string | null;
  maneDevruId: number | string | null;
  kulaDevathaId: number | string | null;
  poojaVrukshaId: number | string | null;
}

interface BackendFamilyDetails extends BackendFamily {
  headPerson: BackendHeadPerson | null;
}

interface FamilyListResponse {
  totalFamilies: number;
  families: BackendFamily[];
}

interface FamilyDetailsResponse {
  family: BackendFamilyDetails;
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

function idToString(
  value: number | string | null | undefined
): string {
  return value === null || value === undefined
    ? ""
    : String(value);
}

function toOptionalId(value: string): number | undefined {
  if (!value.trim()) return undefined;

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid heritage master selection.");
  }

  return id;
}

function getFamilyGotra(
  family: BackendFamilyDetails,
  person: BackendHeadPerson | null
): string {
  return idToString(person?.gotraId ?? family.gotraId);
}

/**
 * Convert the DOB received from the API into the exact format required by
 * an HTML input[type="date"]: YYYY-MM-DD.
 *
 * MySQL/API values can arrive as YYYY-MM-DD, a datetime string, or an ISO
 * timestamp. Keeping the date prefix avoids timezone shifts changing the
 * person's calendar date.
 */
function toDateInputValue(
  value: string | Date | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  // A Date object represents an instant. Read its local calendar components
  // so a database DATE serialized from India local midnight does not move
  // back one day when it is converted to a UTC ISO string.
  const formatLocalDate = (date: Date): string => {
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  if (value instanceof Date) {
    return formatLocalDate(value);
  }

  const normalized = String(value).trim();
  if (!normalized) return "";

  // Pure MySQL DATE strings and timezone-less DATETIME strings represent
  // their written calendar date. Keep the date prefix exactly as supplied.
  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(normalized);

  if (!datePrefix) {
    const parsed = new Date(normalized);
    return formatLocalDate(parsed);
  }

  const year = Number(datePrefix[1]);
  const month = Number(datePrefix[2]);
  const day = Number(datePrefix[3]);
  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return "";
  }

  // Important: mysql2 can turn a MySQL DATE into a JavaScript Date. When
  // JSON.stringify serializes an India-local midnight Date, it may arrive
  // as the previous UTC day at 18:30Z (example: 1960-11-30T18:30:00.000Z).
  // For values with an explicit timezone, convert the instant back to the
  // browser's local calendar date instead of blindly taking the UTC prefix.
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

  if (hasExplicitTimezone) {
    return formatLocalDate(new Date(normalized));
  }

  return `${datePrefix[1]}-${datePrefix[2]}-${datePrefix[3]}`;
}

export function EditFamilyPage() {
  const navigate = useNavigate();

  const [families, setFamilies] = useState<BackendFamily[]>([]);
  const [selected, setSelected] =
    useState<BackendFamilyDetails | null>(null);

  const [cultural, setCultural] =
    useState<CulturalAttributes | null>(null);

  const [masterOptions, setMasterOptions] =
    useState<MasterOptions | null>(null);

  const [query, setQuery] = useState("");
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [masterError, setMasterError] = useState("");
  const [pageError, setPageError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditFamilyValues>({
    resolver: zodResolver(editFamilySchema) as never,
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

  // Load family list and master options.
  const loadInitialData = useCallback(async () => {
    setIsLoadingFamilies(true);
    setPageError("");
    setMasterError("");

    try {
      const [familyResponse, ...masterResponses] =
        await Promise.all([
          api.get<ApiResponse<FamilyListResponse>>("/families"),

          ...MASTER_KEYS.map((key) =>
            api.get<ApiResponse<BackendMaster[]>>(
              `/masters/${MASTER_ENDPOINTS[key]}`
            )
          ),
        ]);

      if (
        !familyResponse.success ||
        !familyResponse.data ||
        !Array.isArray(familyResponse.data.families)
      ) {
        throw new Error(
          familyResponse.message ||
            "Unable to retrieve families."
        );
      }

      const options = {} as MasterOptions;

      MASTER_KEYS.forEach((key, index) => {
        const response = masterResponses[index];

        if (
          !response?.success ||
          !Array.isArray(response.data)
        ) {
          throw new Error(
            `Unable to load ${MASTER_ENDPOINTS[key]} options.`
          );
        }

        options[key] = response.data.map((item) => ({
          value: String(item.id),
          label: item.name,
        }));
      });

      setFamilies(familyResponse.data.families);
      setMasterOptions(options);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load family information."
      );
    } finally {
      setIsLoadingFamilies(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // Fetch the complete family record and head person.
  async function selectFamily(family: BackendFamily) {
    setIsLoadingDetails(true);
    setPageError("");

    try {
      const response = await api.get<
        ApiResponse<FamilyDetailsResponse>
      >(`/families/${family.familyId}`);

      if (!response.success || !response.data?.family) {
        throw new Error(
          response.message ||
            "Unable to retrieve family details."
        );
      }

      const details = response.data.family;
      const person = details.headPerson;

      if (!person) {
        throw new Error(
          "This family does not have an initial head person to edit."
        );
      }

      setSelected(details);

      setCultural({
        gotra: getFamilyGotra(details, person),
        sutra: idToString(person.sutraId),
        panchangSudhi: idToString(person.panchangSudhiId),
        vamsha: idToString(person.vamshaId),
        maneDevru: idToString(person.maneDevruId),
        kulaDevatha: idToString(person.kulaDevathaId),
        poojaVruksha: idToString(person.poojaVrukshaId),
      });

      reset({
        familyName: details.familyName,
        referenceId:
          details.referenceId === null || details.referenceId === undefined
            ? ""
            : String(details.referenceId),
        nativePlace: details.nativePlace ?? "",

        firstName: person.firstName ?? "",
        lastName: person.lastName ?? "",
        fatherName: person.fatherName ?? "",
        motherName: person.motherName ?? "",
        gender: person.gender,
        // Date inputs require YYYY-MM-DD; API responses may include a time.
        // Use family.headDob as a fallback if the person's DOB is empty.
        dob: toDateInputValue(person.dob ?? details.headDob),
        phone: person.phoneNumber ?? "",
        mobile: person.mobileNumber ?? "",
        email: person.email ?? "",
        originalNative: person.originalNative ?? "",
        currentAddress: person.currentAddress ?? "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load the selected family."
      );
    } finally {
      setIsLoadingDetails(false);
    }
  }

  function clearSelection() {
    setSelected(null);
    setCultural(null);
    setPageError("");
    reset({
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
    });
  }

  async function onSubmit(values: EditFamilyValues) {
    if (!selected || !cultural) return;

    try {
      if (
        values.gender !== "male" &&
        values.gender !== "female"
      ) {
        toast.error("Please select a gender.");
        return;
      }

      const referenceIdValue = values.referenceId?.trim();
      const referenceId = referenceIdValue
        ? Number(referenceIdValue)
        : null;

      if (
        referenceIdValue &&
        (!Number.isSafeInteger(referenceId) || referenceId! <= 0)
      ) {
        toast.error("Reference ID must be a positive whole number.");
        return;
      }

      const phone = values.phone?.trim() || "";
      const mobile = values.mobile?.trim() || "";
      const email = values.email?.trim().toLowerCase() || "";

      // Defensive checks before the update request. The Zod schema also
      // validates these fields and displays field-level errors.
      if (phone && !/^\d{6,10}$/.test(phone)) {
        toast.error(
          "Phone must contain digits only and be between 6 and 10 digits."
        );
        return;
      }

      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        toast.error(
          "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9."
        );
        return;
      }

      if (email && !z.string().email().safeParse(email).success) {
        toast.error("Please enter a valid email address.");
        return;
      }

      const gotraId = toOptionalId(cultural.gotra);

      if (!gotraId) {
        toast.error("Please select a Gotra.");
        return;
      }

      const payload = {
        family: {
          familyName: values.familyName.trim(),
          referenceId,
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

      const response = await api.put<
        ApiResponse<FamilyDetailsResponse>
      >(`/families/${selected.familyId}`, payload);

      if (!response.success) {
        throw new Error(
          response.message || "Unable to update family."
        );
      }

      toast.success("Family updated successfully", {
        description: `${values.familyName} has been saved.`,
      });

      clearSelection();

      // Refresh the family list with the latest backend values.
      await loadInitialData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the family."
      );
    }
  }

  const filteredFamilies = families.filter((family) => {
    const term = query.trim().toLowerCase();

    if (!term) return true;

    return (
      family.familyName.toLowerCase().includes(term) ||
      (family.nativePlace ?? "").toLowerCase().includes(term) ||
      String(family.referenceId ?? "").includes(term)
    );
  });

  // PersonalFields uses the shared form register function. Wrap it here
  // so Phone and Mobile accept digits only and cannot exceed 10 digits,
  // and Email is converted to lowercase while the user types.
  const personalRegister = ((
    ...args: Parameters<typeof register>
  ) => {
    const [name] = args;
    const fieldRegistration = register(...args);

    if (
      name === "phone" ||
      name === "mobile" ||
      name === "email"
    ) {
      return {
        ...fieldRegistration,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          if (name === "email") {
            event.currentTarget.value =
              event.currentTarget.value.toLowerCase();
          } else {
            event.currentTarget.value = event.currentTarget.value
              .replace(/\D/g, "")
              .slice(0, 10);
          }

          return fieldRegistration.onChange(event);
        },
      };
    }

    return fieldRegistration;
  }) as unknown as UseFormRegister<z.infer<typeof personSchema>>;

  const personalErrors =
    errors as unknown as FieldErrors<
      z.infer<typeof personSchema>
    >;

  return (
    <PageFade>
      <PageHeader
        title="Edit Family"
        description="Search for a family, then update its details, head person and heritage attributes."
        breadcrumbs={[{ label: "Edit Family" }]}
      />

      {pageError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              Unable to load family information
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pageError}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void loadInitialData()}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {!selected ? (
        <Card className="mx-auto max-w-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Find a family
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by family name, reference ID or native place…"
              aria-label="Search families"
            />

            {isLoadingFamilies ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : filteredFamilies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No families found.
              </p>
            ) : (
              <div
                aria-live="polite"
                className="vv-scroll max-h-72 space-y-2 overflow-y-auto pr-1"
              >
                {filteredFamilies.map((family) => (
                  <button
                    key={family.familyId}
                    type="button"
                    disabled={isLoadingDetails}
                    onClick={() => void selectFamily(family)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {family.familyName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {family.nativePlace || "Native place not provided"}
                      </span>
                    </span>

                    {family.referenceId !== null && family.referenceId !== undefined && (
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                        Ref {family.referenceId}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {isLoadingDetails && (
              <p className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading family details…
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
            <p className="text-sm">
              Editing{" "}
              <span className="font-bold text-foreground">
                {selected.familyName}
              </span>
              {selected.referenceId !== null && selected.referenceId !== undefined && (
                <span className="ml-2 text-muted-foreground">
                  Ref {selected.referenceId}
                </span>
              )}
            </p>

            <div className="flex items-center gap-3">
              {isDirty && (
                <span
                  className="text-xs font-bold uppercase tracking-wide text-gold"
                  role="status"
                >
                  Unsaved changes
                </span>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                <X className="size-4" />
                Choose another
              </Button>
            </div>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">
                Family information
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Family Name"
                htmlFor="ef-name"
                required
                error={errors.familyName?.message}
              >
                <Input
                  id="ef-name"
                  {...register("familyName")}
                />
              </FormField>

              <FormField
                label="Reference ID"
                htmlFor="ef-ref"
                hint="Optional — enter a positive whole number if available"
                error={errors.referenceId?.message}
              >
                <Input
                  id="ef-ref"
                  inputMode="numeric"
                  {...register("referenceId")}
                />
              </FormField>

              <FormField
                label="Native Place"
                htmlFor="ef-native"
                className="sm:col-span-2"
                error={errors.nativePlace?.message}
              >
                <Input
                  id="ef-native"
                  {...register("nativePlace")}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">
                Head person details
              </CardTitle>
            </CardHeader>

            <CardContent>
              <PersonalFields
                register={personalRegister}
                errors={personalErrors}
                idPrefix="ef-head"
              />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">
                Cultural & heritage details
              </CardTitle>
            </CardHeader>

            <CardContent>
              {masterOptions && cultural ? (
                <CulturalFields
                  value={cultural}
                  onChange={(patch) =>
                    setCultural((current) =>
                      current
                        ? { ...current, ...patch }
                        : current
                    )
                  }
                  options={masterOptions}
                  idPrefix="ef-cultural"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading heritage options…
                </p>
              )}

              {masterError && (
                <p className="mt-3 text-sm text-destructive">
                  {masterError}
                </p>
              )}
            </CardContent>
          </Card>

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
                !cultural
              }
            >
              {isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </PageFade>
  );
}
