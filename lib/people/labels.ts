import type { PersonRoleName } from "@/lib/people/types";

export const personRoleLabels: Record<PersonRoleName, string> = {
  buyer: "買方",
  seller: "賣方",
  landlord: "出租方",
  investor: "投資客",
  broker: "同業"
};
