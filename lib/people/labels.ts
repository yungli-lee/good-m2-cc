import type { PersonActivityChannel, PersonActivityType, PersonRoleName } from "@/lib/people/types";

export const personRoleLabels: Record<PersonRoleName, string> = {
  buyer: "買方",
  seller: "賣方",
  landlord: "出租方",
  investor: "投資客",
  broker: "同業"
};

export const personActivityTypeLabels: Record<PersonActivityType, string> = {
  call: "電話聯絡",
  message: "訊息",
  email: "Email",
  meeting: "會面",
  note: "內部紀錄",
  other: "其他"
};

export const personActivityChannelLabels: Record<PersonActivityChannel, string> = {
  phone: "電話",
  line: "Line",
  email: "Email",
  in_person: "面談",
  facebook: "Facebook",
  other: "其他"
};
