import type { ChangeEvent } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { CulturalAttributes, MasterKey } from "@/types";
import { CULTURAL_FIELD_LABELS } from "@/types";
import type { PersonFormValues } from "@/lib/schemas";

export type MasterOptions = Record<MasterKey, { value: string; label: string }[]>;

/** Personal/contact fields shared by Create/Edit Family (head) and Add/Edit Person. */
export function PersonalFields({
  register,
  errors,
  idPrefix = "person",
  lowercaseEmail = false,
}: {
  register: UseFormRegister<PersonFormValues>;
  errors: FieldErrors<PersonFormValues>;
  idPrefix?: string;
  lowercaseEmail?: boolean;
}) {
  const emailRegistration = register("email");

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.toLowerCase();
    void emailRegistration.onChange(event);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="First Name" htmlFor={`${idPrefix}-firstName`} required error={errors.firstName?.message}>
        <Input id={`${idPrefix}-firstName`} placeholder="e.g. Arjun" {...register("firstName")} />
      </FormField>
      <FormField label="Last Name" htmlFor={`${idPrefix}-lastName`} error={errors.lastName?.message}>
        <Input id={`${idPrefix}-lastName`} placeholder="e.g. Rao" {...register("lastName")} />
      </FormField>
      <FormField label="Father Name" htmlFor={`${idPrefix}-fatherName`} error={errors.fatherName?.message}>
        <Input id={`${idPrefix}-fatherName`} placeholder="Father's full name" {...register("fatherName")} />
      </FormField>
      <FormField label="Mother Name" htmlFor={`${idPrefix}-motherName`} error={errors.motherName?.message}>
        <Input id={`${idPrefix}-motherName`} placeholder="Mother's full name" {...register("motherName")} />
      </FormField>
      <FormField label="Gender" htmlFor={`${idPrefix}-gender`} required error={errors.gender?.message}>
        <select
          id={`${idPrefix}-gender`}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register("gender")}
        >
          <option value="">Select gender…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </FormField>
      <FormField label="Date of Birth" htmlFor={`${idPrefix}-dob`} error={errors.dob?.message}>
        <Input id={`${idPrefix}-dob`} type="date" {...register("dob")} />
      </FormField>
      <FormField label="Phone" htmlFor={`${idPrefix}-phone`} error={errors.phone?.message}>
        <Input id={`${idPrefix}-phone`} type="tel" inputMode="tel" placeholder="e.g. +91 80 1234 5678" {...register("phone")} />
      </FormField>
      <FormField label="Mobile" htmlFor={`${idPrefix}-mobile`} error={errors.mobile?.message}>
        <Input id={`${idPrefix}-mobile`} type="tel" inputMode="numeric" placeholder="10-digit Indian mobile" {...register("mobile")} />
      </FormField>
      <FormField label="Email" htmlFor={`${idPrefix}-email`} error={errors.email?.message}>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="name@example.com"
          {...emailRegistration}
          onChange={lowercaseEmail ? handleEmailChange : emailRegistration.onChange}
        />
      </FormField>
      <FormField label="Original Native" htmlFor={`${idPrefix}-originalNative`} error={errors.originalNative?.message}>
        <Input id={`${idPrefix}-originalNative`} placeholder="Ancestral town/village" {...register("originalNative")} />
      </FormField>
      <FormField label="Current Address" htmlFor={`${idPrefix}-currentAddress`} className="sm:col-span-2" error={errors.currentAddress?.message}>
        <Input id={`${idPrefix}-currentAddress`} placeholder="Where they live today" {...register("currentAddress")} />
      </FormField>
    </div>
  );
}

/** Cultural/heritage fields (Gotra, Sutra, …) shared across family and person forms. */
export function CulturalFields({
  value,
  onChange,
  options,
  idPrefix = "cultural",
}: {
  value: CulturalAttributes;
  onChange: (patch: Partial<CulturalAttributes>) => void;
  options: MasterOptions;
  idPrefix?: string;
}) {
  const keys = Object.keys(CULTURAL_FIELD_LABELS) as (keyof CulturalAttributes)[];
  const masterKeyFor: Record<keyof CulturalAttributes, MasterKey> = {
    gotra: "gotra",
    sutra: "sutra",
    panchangSudhi: "panchang_sudhi",
    vamsha: "vamsha",
    maneDevru: "mane_devru",
    kulaDevatha: "kula_devatha",
    poojaVruksha: "pooja_vruksha",
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {keys.map((key) => (
        <FormField key={key} label={CULTURAL_FIELD_LABELS[key]} htmlFor={`${idPrefix}-${key}`}>
          <SearchableSelect
            id={`${idPrefix}-${key}`}
            value={value[key] ?? ""}
            onChange={(v) => onChange({ [key]: v })}
            options={options[masterKeyFor[key]] ?? []}
            placeholder={`Select ${CULTURAL_FIELD_LABELS[key]}…`}
            searchPlaceholder="Search…"
            emptyText="No values yet — add them under Heritage Masters"
          />
        </FormField>
      ))}
    </div>
  );
}
