"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  defaultValue: string;
};

export function KnowledgeCategorySelect({ children, defaultValue }: Props) {
  return (
    <select
      className="select"
      name="category"
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
