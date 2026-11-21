
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Search, Users } from "lucide-react";
import { z } from "zod";

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
import { SearchableSelect } from "@/components/ui/searchable-select";

import { api, type ApiResponse } from "@/lib/api-client";
import { personSchema } from "@/lib/schemas";

import type {
  CulturalAttributes,
  MasterKey,
  RelationType,
} from "@/types";

import { RELATION_LABELS } from "@/types";

import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

// Add Person validation. First name and gender are already required by
// personSchema. Contact fields remain optional, but must be valid when entered.
// Phone: digits only, 6–10 digits.
// Mobile: exactly 10 Indian mobile digits, starting with 6–9.
// Email: valid email format; normalized to lowercase before submission.
const addPersonSchema = personSchema.extend({
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
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a valid email address, for example name@example.com.",
    ),
});

type PersonFormValues = z.input<typeof addPersonSchema>;

// ============================================================
// BACKEND TYPES
// ============================================================

interface BackendFamily {
  familyId: number | string;
  familyName: string;
  referenceId: number | string | null;
  nativePlace: string | null;
  gotraId?: number | string | null;
}

interface BackendPerson {
  personId: number | string;
  familyId: number | string;
  firstName: string;
  lastName: string | null;
  gender: string;
  gotraId?: number | string | null;
  sutraId?: number | string | null;
  panchangSudhiId?: number | string | null;
  vamshaId?: number | string | null;
  maneDevruId?: number | string | null;
  kulaDevathaId?: number | string | null;
  poojaVrukshaId?: number | string | null;
}

interface BackendMaster {
  id: number | string;
  name: string;
}

interface FamilyListResponse {
  families: BackendFamily[];
}

interface FamilyPeopleResponse {
  people: BackendPerson[];
}

interface CreatePersonResponse {
  person: {
    personId: number | string;
    familyId: number | string;
  };
}

interface CreateRelationResponse {
  relation: unknown;
}

// ============================================================
// MASTER ENDPOINTS
// ============================================================

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

// ============================================================
// RELATIONSHIP OPTIONS
// ============================================================

const RELATION_OPTIONS = (
  Object.keys(RELATION_LABELS) as RelationType[]
).map((type) => ({
  value: type,
  label: RELATION_LABELS[type],
}));

const BACKEND_RELATION_TYPES: Record<RelationType, string> = {
  father: "Father",
  mother: "Mother",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
  husband_wife: "Husband-Wife",
  wife_husband: "Wife-Husband",
};

// ============================================================
// GENERAL HELPERS
// ============================================================

function toOptionalId(value: string): number | undefined {
  if (!value.trim()) return undefined;

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid heritage master selection.");
  }

  return id;
}

function normalizeGender(value: string): string {
  return value.trim().toLowerCase();
}

function masterIdToFormValue(
  value: number | string | null | undefined,
): string {
  return value === null ||
    value === undefined ||
    value === ""
    ? ""
    : String(value);
}

// ============================================================
// CULTURAL INHERITANCE
// ============================================================

/**
 * The backend returns family members ordered by Person_Id ASC.
 *
 * The existing project convention treats the earliest Person_Id
 * as the family head.
 *
 * All seven cultural master IDs are inherited from that person.
 *
 * Gotra falls back to family.Gotra_Id when the head person's
 * Gotra_Id is empty.
 *
 * These values remain editable by the administrator.
 */
function getInheritedCulturalAttributes(
  headPerson: BackendPerson | null,
  family: BackendFamily,
): CulturalAttributes {
  return {
    gotra: masterIdToFormValue(
      headPerson?.gotraId ?? family.gotraId,
    ),

    sutra: masterIdToFormValue(
      headPerson?.sutraId,
    ),

    panchangSudhi: masterIdToFormValue(
      headPerson?.panchangSudhiId,
    ),

    vamsha: masterIdToFormValue(
      headPerson?.vamshaId,
    ),

    maneDevru: masterIdToFormValue(
      headPerson?.maneDevruId,
    ),

    kulaDevatha: masterIdToFormValue(
      headPerson?.kulaDevathaId,
    ),

    poojaVruksha: masterIdToFormValue(
      headPerson?.poojaVrukshaId,
    ),
  };
}

// ============================================================
// ADD PERSON PAGE
// ============================================================

export function AddPersonPage() {
  const navigate = useNavigate();

  // ----------------------------------------------------------
  // Family selection
  // ----------------------------------------------------------

  const [families, setFamilies] = useState<BackendFamily[]>([]);
  const [familyQuery, setFamilyQuery] = useState("");
  const [family, setFamily] = useState<BackendFamily | null>(null);

  // ----------------------------------------------------------
  // Selected family members
  // ----------------------------------------------------------

  const [members, setMembers] = useState<BackendPerson[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // ----------------------------------------------------------
  // Cultural attributes
  // ----------------------------------------------------------

  const [cultural, setCultural] =
    useState<CulturalAttributes>(EMPTY_CULTURAL);

  const [culturalInheritedFrom, setCulturalInheritedFrom] =
    useState("");

  const [culturalInheritanceError, setCulturalInheritanceError] =
    useState("");

  // ----------------------------------------------------------
  // Master data options
  // ----------------------------------------------------------

  const [masterOptions, setMasterOptions] =
    useState<MasterOptions | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // ----------------------------------------------------------
  // Relationship to an existing family member
  // ----------------------------------------------------------

  const [relationType, setRelationType] =
    useState<RelationType | "">("");

  const [relatedMemberId, setRelatedMemberId] =
    useState("");

  const [relationshipTypeError, setRelationshipTypeError] =
    useState("");

  const [relatedMemberError, setRelatedMemberError] =
    useState("");

  // ----------------------------------------------------------
  // Female marital status and husband details
  // ----------------------------------------------------------

  const [maritalStatus, setMaritalStatus] =
    useState<"not_married" | "married">("not_married");

  const [husbandFamilyId, setHusbandFamilyId] =
    useState("");

  const [husbandId, setHusbandId] = useState("");

  const [husbandFamilyError, setHusbandFamilyError] =
    useState("");

  const [husbandError, setHusbandError] =
    useState("");

  const [husbandCandidates, setHusbandCandidates] =
    useState<BackendPerson[]>([]);

  const [husbandMembersLoading, setHusbandMembersLoading] =
    useState(false);

  // ==========================================================
  // FORM SETUP
  // ==========================================================

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(addPersonSchema) as never,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,

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

  const gender = watch("gender");

  // The marital status section is available only for female members.
  const isFemale =
    normalizeGender(String(gender ?? "")) === "female";

  // The husband section is available only when:
  // 1. Gender is female.
  // 2. Marital status is married.
  const showHusbandFlow =
    isFemale && maritalStatus === "married";

  // ==========================================================
  // FILTER FAMILIES
  // ==========================================================

  const filteredFamilies = useMemo(() => {
    const query = familyQuery.trim().toLowerCase();

    if (!query) return families;

    return families.filter((item) => {
      return (
        item.familyName.toLowerCase().includes(query) ||
        String(item.referenceId ?? "").includes(query) ||
        (item.nativePlace ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [families, familyQuery]);

  // ==========================================================
  // LOAD INITIAL DATA
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setPageLoading(true);
      setPageError("");

      try {
        const [familyResponse, ...masterResponses] =
          await Promise.all([
            api.get<ApiResponse<FamilyListResponse>>(
              "/families",
            ),

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
              "Unable to load families.",
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
              `Unable to load ${MASTER_ENDPOINTS[key]} options.`,
            );
          }

          options[key] = response.data.map((item) => ({
            value: String(item.id),
            label: item.name,
          }));
        });

        if (cancelled) return;

        setFamilies(familyResponse.data.families);
        setMasterOptions(options);
      } catch (error) {
        if (cancelled) return;

        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to load initial data.",
        );
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD FAMILY MEMBERS AND INHERIT CULTURAL DATA
  // ==========================================================

  useEffect(() => {
    if (!family) {
      setMembers([]);
      setCultural(EMPTY_CULTURAL);
      setCulturalInheritedFrom("");
      setCulturalInheritanceError("");
      setMembersLoading(false);
      return;
    }

    let cancelled = false;
    const selectedFamily = family;

    async function loadMembers() {
      setMembersLoading(true);
      setMembers([]);
      setCulturalInheritedFrom("");
      setCulturalInheritanceError("");

      // Keep family Gotra available while loading family members.
      setCultural(
        getInheritedCulturalAttributes(
          null,
          selectedFamily,
        ),
      );

      try {
        const response = await api.get<
          ApiResponse<FamilyPeopleResponse>
        >(
          `/families/${encodeURIComponent(
            String(selectedFamily.familyId),
          )}/persons`,
        );

        if (
          !response.success ||
          !response.data ||
          !Array.isArray(response.data.people)
        ) {
          throw new Error(
            response.message ||
              "Unable to load family members.",
          );
        }

        if (cancelled) return;

        // Earliest Person_Id is the existing family head.
        const orderedMembers = [
          ...response.data.people,
        ].sort(
          (a, b) =>
            Number(a.personId) - Number(b.personId),
        );

        const headPerson = orderedMembers[0] ?? null;

        setMembers(orderedMembers);

        // Automatically inherit all seven cultural master IDs.
        setCultural(
          getInheritedCulturalAttributes(
            headPerson,
            selectedFamily,
          ),
        );

        if (headPerson) {
          const headName = [
            headPerson.firstName,
            headPerson.lastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          setCulturalInheritedFrom(
            headName || `Person ${headPerson.personId}`,
          );
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load family members.";

          setCulturalInheritanceError(message);

          toast.error(
            `${message} Cultural values could not be inherited.`,
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [family]);

  // ==========================================================
  // LOAD HUSBAND CANDIDATES
  // ==========================================================

  useEffect(() => {
    if (!showHusbandFlow || !husbandFamilyId) {
      setHusbandCandidates([]);
      setHusbandMembersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadHusbandCandidates() {
      setHusbandMembersLoading(true);

      try {
        const response = await api.get<
          ApiResponse<FamilyPeopleResponse>
        >(
          `/families/${encodeURIComponent(
            husbandFamilyId,
          )}/persons`,
        );

        if (
          !response.success ||
          !response.data ||
          !Array.isArray(response.data.people)
        ) {
          throw new Error(
            response.message ||
              "Unable to load members of the selected family.",
          );
        }

        if (!cancelled) {
          setHusbandCandidates(
            response.data.people.filter(
              (person) =>
                normalizeGender(person.gender) === "male",
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load husband candidates.",
          );
        }
      } finally {
        if (!cancelled) {
          setHusbandMembersLoading(false);
        }
      }
    }

    void loadHusbandCandidates();

    return () => {
      cancelled = true;
    };
  }, [husbandFamilyId, showHusbandFlow]);

  // ==========================================================
  // RESET HUSBAND SELECTION WHEN CONDITIONS CHANGE
  // ==========================================================

  useEffect(() => {
    if (!isFemale) {
      // When gender changes away from female, clear marital data.
      setMaritalStatus("not_married");
      setHusbandFamilyId("");
      setHusbandId("");
      setHusbandCandidates([]);
      setHusbandMembersLoading(false);
      setHusbandFamilyError("");
      setHusbandError("");
      return;
    }

    if (maritalStatus !== "married") {
      // Not married means husband details are not applicable.
      setHusbandFamilyId("");
      setHusbandId("");
      setHusbandCandidates([]);
      setHusbandMembersLoading(false);
      setHusbandFamilyError("");
      setHusbandError("");
    }
  }, [isFemale, maritalStatus]);

  // ==========================================================
  // CHANGE FAMILY
  // ==========================================================

  function changeFamily(nextFamily: BackendFamily | null) {
    setFamily(nextFamily);

    setMembers([]);

    setRelatedMemberId("");
    setRelationType("");
    setRelationshipTypeError("");
    setRelatedMemberError("");

    setHusbandFamilyId("");
    setHusbandId("");
    setHusbandFamilyError("");
    setHusbandError("");
    setHusbandCandidates([]);

    setMaritalStatus("not_married");

    setCultural(
      nextFamily
        ? getInheritedCulturalAttributes(null, nextFamily)
        : EMPTY_CULTURAL,
    );

    setCulturalInheritedFrom("");
    setCulturalInheritanceError("");
  }

  // ==========================================================
  // CREATE RELATIONSHIP
  // ==========================================================

  async function createRelationship(
    personId: number | string,
    relatedPersonId: string,
    selectedRelation: string,
  ) {
    const response = await api.post<
      ApiResponse<CreateRelationResponse>
    >(
      `/persons/${personId}/relations`,
      {
        relatedPersonId: Number(relatedPersonId),
        relationType: selectedRelation,
      },
    );

    if (!response.success) {
      throw new Error(
        response.message ||
          "Person was created, but the relationship could not be saved.",
      );
    }
  }

  // ==========================================================
  // SUBMIT FORM
  // ==========================================================

  async function onSubmit(values: PersonFormValues) {
    if (!family) {
      toast.error("Please select a family.");
      return;
    }

    if (!values.gender) {
      toast.error("Please select a gender.");
      return;
    }

    // A person must be linked to an existing family member.
    // Both Relationship Type and Existing Family Member are mandatory.
    const missingRelationshipType = !relationType;
    const missingRelatedMember = !relatedMemberId;

    setRelationshipTypeError(
      missingRelationshipType
        ? "Please select a relationship type."
        : "",
    );
    setRelatedMemberError(
      missingRelatedMember
        ? "Please select an existing family member."
        : "",
    );

    if (missingRelationshipType || missingRelatedMember) {
      toast.error(
        "Please complete both required relationship fields before adding the person.",
      );
      return;
    }

    // Confirm that the selected member is part of the currently selected family.
    const selectedRelatedMember = members.find(
      (member) => String(member.personId) === relatedMemberId,
    );

    if (!selectedRelatedMember) {
      setRelatedMemberError(
        "Select a valid member from the selected family.",
      );
      toast.error("Please select a valid existing family member.");
      return;
    }

    // A married female requires both a husband's family and a male member.
    if (showHusbandFlow) {
      const missingHusbandFamily = !husbandFamilyId;
      const missingHusband = !husbandId;

      setHusbandFamilyError(
        missingHusbandFamily
          ? "Please select the husband's family."
          : "",
      );
      setHusbandError(
        missingHusband
          ? "Please select the husband."
          : "",
      );

      if (missingHusbandFamily || missingHusband) {
        toast.error(
          "Please select both the husband's family and husband.",
        );
        return;
      }

      const selectedHusband = husbandCandidates.find(
        (person) => String(person.personId) === husbandId,
      );

      if (
        !selectedHusband ||
        normalizeGender(selectedHusband.gender) !== "male"
      ) {
        setHusbandError("Select a valid male member as the husband.");
        toast.error("Please select a valid male member as the husband.");
        return;
      }
    }

    if (
      showHusbandFlow &&
      normalizeGender(values.gender) !== "female"
    ) {
      toast.error(
        "The husband selection flow is available only for female members.",
      );
      return;
    }

    let createdPersonId: number | string | null = null;

    try {
      const personPayload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || "",
        fatherName: values.fatherName?.trim() || "",
        motherName: values.motherName?.trim() || "",

        gender:
          normalizeGender(values.gender) === "male"
            ? "Male"
            : "Female",

        dob: values.dob || "",
        phoneNumber: values.phone?.trim() || "",
        mobileNumber: values.mobile?.trim() || "",
        email: values.email?.trim().toLowerCase() || "",

        originalNative:
          values.originalNative?.trim() || "",

        currentAddress:
          values.currentAddress?.trim() || "",

        // Inherited values or manually edited values.
        gotraId: toOptionalId(cultural.gotra),

        sutraId: toOptionalId(cultural.sutra),

        panchangSudhiId: toOptionalId(
          cultural.panchangSudhi,
        ),

        vamshaId: toOptionalId(cultural.vamsha),

        maneDevruId: toOptionalId(
          cultural.maneDevru,
        ),

        kulaDevathaId: toOptionalId(
          cultural.kulaDevatha,
        ),

        poojaVrukshaId: toOptionalId(
          cultural.poojaVruksha,
        ),
      };

      // Step 1: Create the person in the selected family.
      const response = await api.post<
        ApiResponse<CreatePersonResponse>
      >(
        `/families/${family.familyId}/persons`,
        personPayload,
      );

      if (
        !response.success ||
        !response.data?.person?.personId
      ) {
        throw new Error(
          response.message ||
            "Unable to create the person.",
        );
      }

      const newPersonId = response.data.person.personId;
      createdPersonId = newPersonId;

      // Relationship requests are separate backend transactions.
      const relationshipErrors: string[] = [];

      // Step 2: Relationship to an existing family member.
      if (relationType && relatedMemberId) {
        try {
          await createRelationship(
            newPersonId,
            relatedMemberId,
            BACKEND_RELATION_TYPES[relationType],
          );
        } catch (error) {
          relationshipErrors.push(
            error instanceof Error
              ? error.message
              : "The selected family relationship could not be saved.",
          );
        }
      }

      // Step 3: Add spouse relationship only when the
      // person is female and marital status is married.
      if (showHusbandFlow && husbandId) {
        try {
          await createRelationship(
            newPersonId,
            husbandId,
            "Wife-Husband",
          );
        } catch (error) {
          relationshipErrors.push(
            error instanceof Error
              ? error.message
              : "The spouse relationship could not be saved.",
          );
        }
      }

      if (relationshipErrors.length > 0) {
        toast.warning(
          "Person added, but a relationship needs attention",
          {
            description: relationshipErrors.join(" "),
            duration: 8000,
          },
        );
      } else {
        toast.success("Person added successfully", {
          description: `${values.firstName} has been added to ${family.familyName}.`,
        });
      }

      await navigate({ to: "/app" });
    } catch (error) {
      if (createdPersonId !== null) {
        toast.warning("Person was added", {
          description:
            "The person is saved, but a later operation failed. Review the person's relationships from the family record.",
          duration: 8000,
        });

        await navigate({ to: "/app" });
        return;
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add the person.",
      );
    }
  }

  // ==========================================================
  // FORM TYPES
  // ==========================================================

  type ValidatedPersonValues = z.infer<typeof personSchema>;

  // Normalize contact input at entry as an extra safeguard:
  // Phone and Mobile accept digits only and stop at 10 digits.
  // Email is converted to lowercase as the user types.
  const personalRegister = ((
    ...args: Parameters<typeof register>
  ) => {
    const [name] = args;
    const fieldRegistration = register(...args);

    if (name !== "phone" && name !== "mobile" && name !== "email") {
      return fieldRegistration;
    }

    return {
      ...fieldRegistration,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        if (name === "email") {
          event.currentTarget.value = event.currentTarget.value.toLowerCase();
        } else {
          event.currentTarget.value = event.currentTarget.value
            .replace(/\D/g, "")
            .slice(0, 10);
        }

        return fieldRegistration.onChange(event);
      },
    };
  }) as unknown as UseFormRegister<ValidatedPersonValues>;

  const personalErrors =
    errors as unknown as FieldErrors<ValidatedPersonValues>;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageFade>
      <PageHeader
        title="Add Person"
        description="Select a family, then record the member's details, heritage attributes and relationships."
        breadcrumbs={[{ label: "Add Person" }]}
      />

      {pageError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {pageError}
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 1: FAMILY SELECTION                             */}
      {/* ==================================================== */}

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
                  value={familyQuery}
                  onChange={(event) =>
                    setFamilyQuery(event.target.value)
                  }
                  placeholder="Search family name, reference ID or native place…"
                  className="pl-9"
                  aria-label="Search families"
                />
              </div>

              {pageLoading ? (
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
                <div className="vv-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredFamilies.map((item) => (
                    <button
                      key={item.familyId}
                      type="button"
                      onClick={() => changeFamily(item)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {item.familyName}
                        </span>

                        <span className="block truncate text-xs text-muted-foreground">
                          {item.nativePlace ||
                            "Native place not provided"}
                        </span>
                      </span>

                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                        Ref {item.referenceId ?? "—"}
                      </span>
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
                  {family.nativePlace}
                  {family.referenceId
                    ? ` · Ref ${family.referenceId}`
                    : ""}
                </span>
              </p>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => changeFamily(null)}
              >
                <Users className="size-4" />
                Change family
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================================================== */}
      {/* STEP 2: PERSONAL DETAILS                             */}
      {/* ==================================================== */}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-6"
        noValidate
      >
        <Card
          className={
            family
              ? "shadow-soft"
              : "pointer-events-none opacity-50 shadow-soft"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              Person details
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <PersonalFields
              register={personalRegister}
              errors={personalErrors}
              idPrefix="ap"
            />

            {/* Relationship to an existing member */}
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Relationship to an existing member
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Relationship Type"
                  htmlFor="ap-rel-type"
                  required
                  error={relationshipTypeError}
                >
                  <SearchableSelect
                    id="ap-rel-type"
                    value={relationType}
                    onChange={(value) => {
                      setRelationType(value as RelationType | "");
                      setRelationshipTypeError("");

                      if (!value) {
                        setRelatedMemberId("");
                        setRelatedMemberError("");
                      }
                    }}
                    options={RELATION_OPTIONS}
                    placeholder="Select relationship type…"
                  />
                </FormField>

                <FormField
                  label="Existing Family Member"
                  htmlFor="ap-rel-member"
                  required
                  error={relatedMemberError}
                  hint={
                    membersLoading
                      ? "Loading members…"
                      : members.length === 0 && family
                        ? "No existing members are available in this family."
                        : undefined
                  }
                >
                  <SearchableSelect
                    id="ap-rel-member"
                    value={relatedMemberId}
                    onChange={(value) => {
                      setRelatedMemberId(value);
                      setRelatedMemberError("");
                    }}
                    disabled={
                      !family ||
                      relationType === "" ||
                      membersLoading ||
                      members.length === 0
                    }
                    options={members.map((member) => ({
                      value: String(member.personId),
                      label: `${member.firstName} ${member.lastName ?? ""}`.trim(),
                    }))}
                    placeholder={
                      family
                        ? "Select a member…"
                        : "Select a family first"
                    }
                  />
                </FormField>
              </div>
            </div>

            {/* ================================================= */}
            {/* MARITAL STATUS — FEMALE ONLY                     */}
            {/* ================================================= */}

            {isFemale && (
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Marital status
                </h3>

                <div
                  className="flex gap-2"
                  role="radiogroup"
                  aria-label="Marital status"
                >
                  {([
                    {
                      value: "not_married",
                      label: "Not Married",
                    },
                    {
                      value: "married",
                      label: "Married",
                    },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={
                        maritalStatus === option.value
                      }
                      onClick={() =>
                        setMaritalStatus(option.value)
                      }
                      className={
                        maritalStatus === option.value
                          ? "rounded-full border border-primary bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
                          : "rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Husband details appear only when married */}
                <AnimatePresence initial={false}>
                  {showHusbandFlow && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.22,
                        ease: "easeOut",
                      }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-4 rounded-xl border border-border bg-secondary/50 p-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            Husband details
                          </h4>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Select the family and existing male member
                            who is the husband.
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            label="Husband's Family"
                            htmlFor="ap-husband-family"
                            required
                            error={husbandFamilyError}
                          >
                            <SearchableSelect
                              id="ap-husband-family"
                              value={husbandFamilyId}
                              onChange={(value) => {
                                setHusbandFamilyId(value);
                                setHusbandId("");
                                setHusbandFamilyError("");
                                setHusbandError("");
                              }}
                              options={families.map((item) => ({
                                value: String(item.familyId),
                                label: item.familyName,
                              }))}
                              placeholder="Select the husband's family…"
                            />
                          </FormField>

                          <FormField
                            label="Husband"
                            htmlFor="ap-husband"
                            required
                            error={husbandError}
                            hint={
                              husbandMembersLoading
                                ? "Loading members…"
                                : undefined
                            }
                          >
                            <SearchableSelect
                              id="ap-husband"
                              value={husbandId}
                              onChange={(value) => {
                                setHusbandId(value);
                                setHusbandError("");
                              }}
                              disabled={
                                !husbandFamilyId ||
                                husbandMembersLoading
                              }
                              options={husbandCandidates.map(
                                (member) => ({
                                  value: String(member.personId),
                                  label: `${member.firstName} ${member.lastName ?? ""}`.trim(),
                                }),
                              )}
                              placeholder={
                                husbandFamilyId
                                  ? "Select a male member…"
                                  : "Select a family first"
                              }
                              emptyText="No male members in this family"
                            />
                          </FormField>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* STEP 3: CULTURAL AND HERITAGE DETAILS              */}
        {/* ================================================== */}

        <Card
          className={
            family
              ? "shadow-soft"
              : "pointer-events-none opacity-50 shadow-soft"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              Cultural & heritage details
            </CardTitle>
          </CardHeader>

          <CardContent>
            {family && (
              <div className="mb-4 rounded-xl border border-sage/30 bg-sage/5 px-4 py-3 text-sm">
                {membersLoading ? (
                  <p className="text-muted-foreground">
                    Loading the selected family's head details
                    and cultural values…
                  </p>
                ) : culturalInheritanceError ? (
                  <p className="text-muted-foreground">
                    The existing family head's cultural values
                    could not be loaded. The family's Gotra,
                    when available, is prefilled. You can select
                    or edit the remaining values manually.
                  </p>
                ) : culturalInheritedFrom ? (
                  <p className="text-foreground">
                    Cultural values have been prefilled from
                    the family head{" "}
                    <span className="font-semibold">
                      {culturalInheritedFrom}
                    </span>
                    . You can edit any field before saving this
                    person.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No existing family head was found. The
                    family's Gotra, when available, has been
                    prefilled. You can select or edit the
                    remaining values.
                  </p>
                )}
              </div>
            )}

            {masterOptions ? (
              <div
                className={
                  membersLoading
                    ? "pointer-events-none opacity-60"
                    : ""
                }
                aria-busy={membersLoading}
              >
                <CulturalFields
                  value={cultural}
                  onChange={(patch) =>
                    setCultural((current) => ({
                      ...current,
                      ...patch,
                    }))
                  }
                  options={masterOptions}
                  idPrefix="ap-cultural"
                />
              </div>
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

        {/* ================================================== */}
        {/* FORM ACTIONS                                       */}
        {/* ================================================== */}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/app">Cancel</Link>
          </Button>

          <Button
            type="submit"
            disabled={
              !family ||
              !masterOptions ||
              pageLoading ||
              membersLoading ||
              isSubmitting
            }
          >
            {isSubmitting && (
              <Loader2 className="size-4 animate-spin" />
            )}

            {isSubmitting ? "Adding…" : "Add Person"}
          </Button>
        </div>
      </form>
    </PageFade>
  );
}
