
export type Role = "admin" | "user";

export type Gender = "male" | "female";

export type MaritalStatus = "not_married" | "married";

/**
 * Frontend relationship identifiers.
 * These are mapped to backend enum values before API requests.
 */
export type RelationType =
  | "father"
  | "mother"
  | "son"
  | "daughter"
  | "brother"
  | "sister"
  | "husband_wife"
  | "wife_husband";

export const RELATION_LABELS: Record<RelationType, string> = {
  father: "Father",
  mother: "Mother",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
  husband_wife: "Husband–Wife",
  wife_husband: "Wife–Husband",
};

export type MasterKey =
  | "gotra"
  | "sutra"
  | "vamsha"
  | "kula_devatha"
  | "mane_devru"
  | "panchang_sudhi"
  | "pooja_vruksha";

/**
 * Master data item returned by the backend.
 */
export interface MasterItem {
  id: string;
  name: string;
}

export interface CulturalAttributes {
  gotra: string;
  sutra: string;
  panchangSudhi: string;
  vamsha: string;
  maneDevru: string;
  kulaDevatha: string;
  poojaVruksha: string;
}

export const CULTURAL_FIELD_LABELS: Record<
  keyof CulturalAttributes,
  string
> = {
  gotra: "Gotra",
  sutra: "Sutra",
  panchangSudhi: "Panchang Sudhi",
  vamsha: "Vamsha",
  maneDevru: "Mane Devru",
  kulaDevatha: "Kula Devatha",
  poojaVruksha: "Pooja Vruksha",
};

/**
 * Legacy normalized client-side domain models.
 */
export interface Person extends CulturalAttributes {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  gender: Gender;
  dob: string;
  phone: string;
  mobile: string;
  email: string;
  originalNative: string;
  currentAddress: string;
  maritalStatus: MaritalStatus;
  isHead: boolean;
  createdAt: string;
}

export interface Family extends CulturalAttributes {
  id: string;
  familyName: string;
  referenceId: string;
  nativePlace: string;
  headPersonId: string;
  createdAt: string;
}

export interface Relationship {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: RelationType;
  createdAt: string;
}

export interface Session {
  userId: string;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  signedInAt: string;
}

/**
 * Session context shared by authenticated routes and child pages.
 */
export interface AppOutletContext {
  session: Session;
  setSession: (session: Session) => void;
}
