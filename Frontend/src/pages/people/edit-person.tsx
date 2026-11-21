import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Search, UserCog, X } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";

import { api, type ApiResponse } from "@/lib/api-client";
import { personSchema } from "@/lib/schemas";
import type {
  CulturalAttributes,
  MasterKey,
  Person,
} from "@/types";
import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { z } from "zod";

// Edit Person validation keeps the existing required fields from personSchema:
// First Name and Gender remain mandatory. Optional contact fields are validated
// when entered, using the same rules as the Create/Edit Family forms.
const editPersonSchema = personSchema.extend({
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^\d{6,10}$/.test(value),
      "Phone must contain digits only and be between 6 and 10 digits.",
    ),
  mobile: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[6-9]\d{9}$/.test(value),
      "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.",
    ),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value || z.string().email().safeParse(value).success,
      "Enter a valid email address, for example name@example.com.",
    ),
});

type PersonFormInput = z.input<typeof editPersonSchema>;
type PersonFormOutput = z.infer<typeof editPersonSchema>;

interface BackendFamily {
  familyId: number | string;
  familyName: string;
  referenceId: number | string | null;
  nativePlace: string | null;
}

interface BackendPerson {
  personId: number | string;
  familyId: number | string;
  firstName: string;
  lastName: string | null;
  fatherName: string | null;
  motherName: string | null;
  gender: string | null;
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

interface BackendMaster {
  id: number | string;
  name: string;
}

interface FamilyListResponse {
  totalFamilies: number;
  families: BackendFamily[];
}

interface PeopleListResponse {
  totalMembers: number;
  people: BackendPerson[];
}

interface PersonResponse {
  person: BackendPerson;
}

const MASTER_CONFIG: {
  key: MasterKey;
  endpoint: string;
  personField: keyof CulturalAttributes;
  apiField:
    | "gotraId"
    | "sutraId"
    | "panchangSudhiId"
    | "vamshaId"
    | "maneDevruId"
    | "kulaDevathaId"
    | "poojaVrukshaId";
}[] = [
  {
    key: "gotra",
    endpoint: "gotra",
    personField: "gotra",
    apiField: "gotraId",
  },
  {
    key: "sutra",
    endpoint: "sutra",
    personField: "sutra",
    apiField: "sutraId",
  },
  {
    key: "vamsha",
    endpoint: "vamsha",
    personField: "vamsha",
    apiField: "vamshaId",
  },
  {
    key: "kula_devatha",
    endpoint: "kula-devatha",
    personField: "kulaDevatha",
    apiField: "kulaDevathaId",
  },
  {
    key: "mane_devru",
    endpoint: "mane-devru",
    personField: "maneDevru",
    apiField: "maneDevruId",
  },
  {
    key: "panchang_sudhi",
    endpoint: "panchang-sudhi",
    personField: "panchangSudhi",
    apiField: "panchangSudhiId",
  },
  {
    key: "pooja_vruksha",
    endpoint: "pooja-vruksha",
    personField: "poojaVruksha",
    apiField: "poojaVrukshaId",
  },
];

const EMPTY_CULTURAL: CulturalAttributes = {
  gotra: "",
  sutra: "",
  panchangSudhi: "",
  vamsha: "",
  maneDevru: "",
  kulaDevatha: "",
  poojaVruksha: "",
};

function normalizeGender(gender: string | null): "male" | "female" {
  return gender?.toLowerCase() === "female" ? "female" : "male";
}

function normalizeDate(value: string | null): string {
  if (!value) return "";

  // Handles both YYYY-MM-DD and ISO date strings.
  return value.slice(0, 10);
}

export function EditPersonPage() {
  const [families, setFamilies] = useState<BackendFamily[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [familiesLoading, setFamiliesLoading] = useState(true);

  const [family, setFamily] = useState<BackendFamily | null>(null);
  const [members, setMembers] = useState<BackendPerson[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const [selectedPerson, setSelectedPerson] =
    useState<BackendPerson | null>(null);

  const [cultural, setCultural] =
    useState<CulturalAttributes | null>(null);

  const [masterOptions, setMasterOptions] =
    useState<MasterOptions | null>(null);

  const [masterRecords, setMasterRecords] = useState<
    Record<MasterKey, BackendMaster[]>
  >({
    gotra: [],
    sutra: [],
    vamsha: [],
    kula_devatha: [],
    mane_devru: [],
    panchang_sudhi: [],
    pooja_vruksha: [],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PersonFormInput>({
    resolver: zodResolver(editPersonSchema) as never,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
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

  // Keep the shared PersonalFields component and its existing UI, while
  // enforcing digits-only input and a 10-digit maximum for Phone and Mobile.
  const personalRegister = ((...args: Parameters<typeof register>) => {
    const [fieldName] = args;
    const fieldRegistration = register(...args);

    if (
      fieldName !== "phone" &&
      fieldName !== "mobile" &&
      fieldName !== "email"
    ) {
      return fieldRegistration;
    }

    return {
      ...fieldRegistration,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        if (fieldName === "email") {
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
  }) as unknown as UseFormRegister<PersonFormOutput>;

  const personalErrors =
    errors as unknown as FieldErrors<PersonFormOutput>;

  const filteredFamilies = useMemo(() => {
    const term = familySearch.trim().toLowerCase();

    if (!term) return families;

    return families.filter((item) => {
      return (
        item.familyName.toLowerCase().includes(term) ||
        String(item.referenceId ?? "").toLowerCase().includes(term) ||
        (item.nativePlace ?? "").toLowerCase().includes(term)
      );
    });
  }, [families, familySearch]);

  // Load families from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadFamilies() {
      try {
        setFamiliesLoading(true);

        const response =
          await api.get<ApiResponse<FamilyListResponse>>("/families");

        if (!cancelled) {
          setFamilies(response.data?.families ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load families.",
          );
        }
      } finally {
        if (!cancelled) {
          setFamiliesLoading(false);
        }
      }
    }

    loadFamilies();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load all heritage master options from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadMasters() {
      try {
        const results = await Promise.all(
          MASTER_CONFIG.map(async (config) => {
            const response = await api.get<
              ApiResponse<BackendMaster[]>
            >(`/masters/${config.endpoint}`);

            return {
              key: config.key,
              records: response.data,
            };
          }),
        );

        if (cancelled) return;

        const records = { ...masterRecords };

        for (const result of results) {
          records[result.key] = result.records ?? [];
        }

        const options = {} as MasterOptions;

        for (const config of MASTER_CONFIG) {
          options[config.key] = records[config.key].map((item) => ({
            value: String(item.id),
            label: item.name,
          }));
        }

        setMasterRecords(records);
        setMasterOptions(options);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load heritage master data.",
          );
        }
      }
    }

    loadMasters();

    return () => {
      cancelled = true;
    };
    // The master data is loaded once when this page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load members whenever the selected family changes.
  useEffect(() => {
    if (!family) return;

    let cancelled = false;

    async function loadMembers() {
      try {
        setMembers(null);
        setMembersLoading(true);

        const response =
          await api.get<ApiResponse<PeopleListResponse>>(
            `/families/${family!.familyId}/persons`,
          );

        if (!cancelled) {
          setMembers(response.data?.people ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setMembers([]);

          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load family members.",
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [family]);

  function selectFamily(item: BackendFamily) {
    setFamily(item);
    setSelectedPerson(null);
    setCultural(null);
    setFamilySearch("");
  }

  async function selectPerson(person: BackendPerson) {
    try {
      const response = await api.get<ApiResponse<PersonResponse>>(
        `/persons/${person.personId}`,
      );

      const details = response.data?.person;

      if (!details) {
        toast.error("Person details were not found.");
        return;
      }

      setSelectedPerson(details);

      const culturalValues: CulturalAttributes = {
        gotra: details.gotraId ? String(details.gotraId) : "",
        sutra: details.sutraId ? String(details.sutraId) : "",
        panchangSudhi: details.panchangSudhiId
          ? String(details.panchangSudhiId)
          : "",
        vamsha: details.vamshaId ? String(details.vamshaId) : "",
        maneDevru: details.maneDevruId
          ? String(details.maneDevruId)
          : "",
        kulaDevatha: details.kulaDevathaId
          ? String(details.kulaDevathaId)
          : "",
        poojaVruksha: details.poojaVrukshaId
          ? String(details.poojaVrukshaId)
          : "",
      };

      setCultural(culturalValues);

      reset({
        firstName: details.firstName ?? "",
        lastName: details.lastName ?? "",
        fatherName: details.fatherName ?? "",
        motherName: details.motherName ?? "",
        gender: normalizeGender(details.gender),
        dob: normalizeDate(details.dob),
        phone: details.phoneNumber ?? "",
        mobile: details.mobileNumber ?? "",
        email: details.email?.toLowerCase() ?? "",
        originalNative: details.originalNative ?? "",
        currentAddress: details.currentAddress ?? "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load person details.",
      );
    }
  }

  async function onSubmit(values: PersonFormInput) {
    if (!selectedPerson || !cultural) return;

    try {
      const masterIds: Record<string, number | null> = {};

      for (const config of MASTER_CONFIG) {
        const selectedId = cultural[config.personField];

        masterIds[config.apiField] = selectedId
          ? Number(selectedId)
          : null;
      }

      await api.put<ApiResponse<PersonResponse>>(
        `/persons/${selectedPerson.personId}`,
        {
          firstName: values.firstName.trim(),
          lastName: values.lastName ?? "",
          fatherName: values.fatherName ?? "",
          motherName: values.motherName ?? "",
          gender:
            values.gender === "female" ? "Female" : "Male",
          dob: values.dob || "",
          phoneNumber: values.phone ?? "",
          mobileNumber: values.mobile ?? "",
          email: values.email?.trim().toLowerCase() ?? "",
          originalNative: values.originalNative ?? "",
          currentAddress: values.currentAddress ?? "",
          ...masterIds,
        },
      );

      toast.success("Person updated", {
        description: `${values.firstName} ${values.lastName ?? ""} saved successfully.`,
      });

      setSelectedPerson(null);
      setCultural(null);

      reset({
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

      if (family) {
        const response =
          await api.get<ApiResponse<PeopleListResponse>>(
            `/families/${family.familyId}/persons`,
          );

        setMembers(response.data?.people ?? []);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the person.",
      );
    }
  }

  function cancelEdit() {
    setSelectedPerson(null);
    setCultural(null);

    reset({
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

  return (
    <PageFade>
      <PageHeader
        title="Edit Person"
        description="Find the family, pick the member, then update their details and heritage attributes."
        breadcrumbs={[{ label: "Edit Person" }]}
      />

      <div className="space-y-6">
        {/* Step 1: Select family */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              Select a family
            </CardTitle>
          </CardHeader>

          <CardContent>
            {!family ? (
              <div className="max-w-xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={familySearch}
                    onChange={(event) =>
                      setFamilySearch(event.target.value)
                    }
                    placeholder="Search by family name, native place or reference ID…"
                    className="pl-9"
                    aria-label="Search families"
                  />
                </div>

                {familiesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-16 w-full rounded-xl"
                      />
                    ))}
                  </div>
                ) : filteredFamilies.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No families found.
                  </p>
                ) : (
                  <div className="vv-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
                    {filteredFamilies.map((item) => (
                      <button
                        key={item.familyId}
                        type="button"
                        onClick={() => selectFamily(item)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {item.familyName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.nativePlace || "Native place not specified"}
                          </span>
                        </span>

                        {item.referenceId !== null && item.referenceId !== undefined && (
                          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                            Ref {item.referenceId}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
                <p className="text-sm">
                  <span className="font-bold text-foreground">
                    {family.familyName}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {family.nativePlace ?? ""}
                    {family.referenceId
                      ? ` · Ref ${family.referenceId}`
                      : ""}
                  </span>
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFamily(null);
                    setMembers(null);
                    setSelectedPerson(null);
                    setCultural(null);
                  }}
                >
                  <X className="size-4" />
                  Change family
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select member */}
        {family && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                Select a member
              </CardTitle>
            </CardHeader>

            <CardContent>
              {membersLoading || members === null ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-12 w-full rounded-xl"
                    />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  This family has no members yet — add one first.
                </p>
              ) : (
                <div className="vv-scroll grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {members.map((member, index) => (
                    <button
                      key={member.personId}
                      type="button"
                      onClick={() => void selectPerson(member)}
                      className={
                        selectedPerson?.personId === member.personId
                          ? "flex items-center justify-between rounded-xl border border-primary bg-primary/10 px-4 py-2.5 text-left"
                          : "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      }
                    >
                      <span className="text-sm font-semibold">
                        {`${member.firstName} ${member.lastName ?? ""}`.trim()}
                      </span>

                      {index === 0 && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                          Head
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Edit person */}
        {selectedPerson && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
              <UserCog
                className="size-4 text-gold"
                aria-hidden="true"
              />

              <p className="text-sm">
                Editing{" "}
                <span className="font-bold">
                  {`${selectedPerson.firstName} ${selectedPerson.lastName ?? ""}`.trim()}
                </span>

                {isDirty && (
                  <span
                    className="ml-3 text-xs font-bold uppercase tracking-wide text-gold"
                    role="status"
                  >
                    Unsaved changes
                  </span>
                )}
              </p>
            </div>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">
                  Person details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <PersonalFields
                  register={personalRegister}
                  errors={personalErrors}
                  idPrefix="ep"
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
                        current ? { ...current, ...patch } : current,
                      )
                    }
                    options={masterOptions}
                    idPrefix="ep-cultural"
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-16 animate-pulse rounded-lg bg-muted"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageFade>
  );
}