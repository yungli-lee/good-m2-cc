import type {
  personRoleNames,
  personSources,
  personStatuses
} from "./constants.ts";

export type PersonSource = (typeof personSources)[number];
export type PersonStatus = (typeof personStatuses)[number];
export type PersonRoleName = (typeof personRoleNames)[number];

export type Person = {
  id: string;
  name: string;
  display_name: string;
  legal_name: string | null;
  phone: string | null;
  normalized_phone: string | null;
  line_id: string | null;
  normalized_line_id: string | null;
  email: string | null;
  address: string | null;
  normalized_email: string | null;
  source: PersonSource;
  status: PersonStatus;
  assigned_to: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonRole = {
  id: string;
  person_id: string;
  role: PersonRoleName;
  created_by: string | null;
  created_at: string;
};

export type PersonWithRoles = Person & {
  roles: PersonRoleName[];
};

export type PersonAssignee = {
  id: string;
  email: string | null;
  display_name: string | null;
};
