"use client";

import { useActionState } from "react";
import type { DraftPropertyFormState } from "@/lib/properties/schema";

type DraftPropertyAction = (
  state: DraftPropertyFormState,
  formData: FormData
) => Promise<DraftPropertyFormState>;

function FieldError({ message }: { message?: string }) {
  return message ? <p style={{ color: "#b42318", fontWeight: 700, margin: 0 }}>{message}</p> : null;
}

export function DraftPropertyForm({
  action,
  initialState,
  submitLabel = "建立草稿",
  pendingLabel = "建立中..."
}: {
  action: DraftPropertyAction;
  initialState: DraftPropertyFormState;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
      {state.formError ? <div className="notice">{state.formError}</div> : null}
      <div className="field">
        <label htmlFor="title">案名 *</label>
        <input
          className="input"
          id="title"
          name="title"
          defaultValue={state.values.title}
          required
          aria-invalid={Boolean(state.fieldErrors.title)}
        />
        <FieldError message={state.fieldErrors.title} />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug</label>
        <input
          className="input"
          id="slug"
          name="slug"
          defaultValue={state.values.slug}
          placeholder="可留空，系統會自動產生"
          aria-invalid={Boolean(state.fieldErrors.slug)}
        />
        <FieldError message={state.fieldErrors.slug} />
      </div>
      <div className="field">
        <label htmlFor="price">開價</label>
        <input
          className="input"
          id="price"
          name="price"
          type="number"
          min="0"
          defaultValue={state.values.price}
          aria-invalid={Boolean(state.fieldErrors.price)}
        />
        <FieldError message={state.fieldErrors.price} />
      </div>
      <div className="field">
        <label htmlFor="address_public">公開地址</label>
        <input
          className="input"
          id="address_public"
          name="address_public"
          defaultValue={state.values.address_public}
          aria-invalid={Boolean(state.fieldErrors.address_public)}
        />
        <FieldError message={state.fieldErrors.address_public} />
      </div>
      <div className="actions">
        <button className="button" type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
