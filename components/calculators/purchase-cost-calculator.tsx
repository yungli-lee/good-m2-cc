"use client";

import { useMemo, useState } from "react";
import {
  calculatePurchaseCost,
  defaultPurchaseCostInput,
  type PurchaseCostInput,
  validatePurchaseCostInput
} from "@/lib/calculators/purchase-cost";
import { formatWanDecimal } from "@/lib/calculators/format";

type FieldKey = keyof PurchaseCostInput;

const fields: Array<{ key: FieldKey; label: string; min: number; step: string; suffix?: string; note?: string }> = [
  { key: "transactionPriceWan", label: "成交價", min: 1, step: "1", suffix: "萬元" },
  { key: "loanRatioPercent", label: "貸款成數", min: 0, step: "1", suffix: "%" },
  { key: "brokerageFeePercent", label: "仲介服務費率", min: 0, step: "0.1", suffix: "%" },
  {
    key: "assessedBuildingValueWan",
    label: "房屋評定現值",
    min: 0,
    step: "1",
    suffix: "萬元",
    note: "契稅以房屋評定現值計算，且只針對建物課徵，土地不課契稅。"
  },
  { key: "deedTaxPercent", label: "契稅率", min: 0, step: "0.1", suffix: "%" },
  { key: "stampTaxPercent", label: "印花稅率", min: 0, step: "0.01", suffix: "%" },
  { key: "scrivenerFeeWan", label: "代書費", min: 0, step: "0.1", suffix: "萬元" },
  { key: "registrationMiscFeeWan", label: "規費與雜支", min: 0, step: "0.1", suffix: "萬元" }
];

const pageStyles = {
  panel: {
    display: "grid",
    gap: 18,
    padding: "clamp(20px, 4vw, 32px)",
    border: "1px solid rgba(16, 35, 67, 0.12)",
    borderRadius: 8,
    background: "#fff"
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  },
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginTop: 18
  },
  summaryCard: {
    padding: 18,
    border: "1px solid rgba(16, 35, 67, 0.12)",
    borderRadius: 8,
    background: "#fff"
  },
  highlightCard: {
    padding: 22,
    border: "1px solid rgba(201, 154, 67, 0.42)",
    borderRadius: 8,
    background: "#fff7df"
  }
} satisfies Record<string, React.CSSProperties>;

function inputToState(input: PurchaseCostInput) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, String(value)])
  ) as Record<FieldKey, string>;
}

function stateToInput(state: Record<FieldKey, string>): PurchaseCostInput {
  return {
    transactionPriceWan: Number(state.transactionPriceWan),
    loanRatioPercent: Number(state.loanRatioPercent),
    brokerageFeePercent: Number(state.brokerageFeePercent),
    assessedBuildingValueWan: Number(state.assessedBuildingValueWan),
    deedTaxPercent: Number(state.deedTaxPercent),
    stampTaxPercent: Number(state.stampTaxPercent),
    scrivenerFeeWan: Number(state.scrivenerFeeWan),
    registrationMiscFeeWan: Number(state.registrationMiscFeeWan)
  };
}

export function PurchaseCostCalculator() {
  const [formState, setFormState] = useState(inputToState(defaultPurchaseCostInput));
  const input = useMemo(() => stateToInput(formState), [formState]);
  const validationMessage = validatePurchaseCostInput(input);
  const result = validationMessage ? null : calculatePurchaseCost(input);

  function updateField(key: FieldKey, value: string) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <form style={pageStyles.panel}>
        <div style={pageStyles.fields}>
          {fields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}{field.suffix ? `（${field.suffix}）` : ""}</span>
              <input
                className="input"
                type="number"
                min={field.min}
                step={field.step}
                value={formState[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
              />
              {field.note ? <small className="muted">{field.note}</small> : null}
            </label>
          ))}
        </div>
      </form>

      {validationMessage ? <div className="notice">{validationMessage}</div> : null}

      {result ? (
        <>
          <article style={pageStyles.highlightCard} aria-live="polite">
            <div className="muted">預估購屋總現金需求</div>
            <strong style={{ display: "block", marginTop: 8, color: "#102343", fontSize: "clamp(2rem, 6vw, 3.2rem)" }}>
              {formatWanDecimal(result.totalCashNeededWan)}
            </strong>
          </article>

          <div style={pageStyles.summary}>
            {[
              ["貸款金額", result.loanAmountWan],
              ["自備款", result.downPaymentWan],
              ["仲介服務費", result.brokerageFeeWan],
              ["契稅", result.deedTaxWan],
              ["印花稅", result.stampTaxWan],
              ["代書費", result.scrivenerFeeWan],
              ["規費與雜支", result.registrationMiscFeeWan],
              ["履約保證費", result.escrowFeeWan]
            ].map(([label, value]) => (
              <article key={label} style={pageStyles.summaryCard}>
                <div className="muted">{label}</div>
                <strong style={{ display: "block", marginTop: 8, color: "#102343", fontSize: 24 }}>{formatWanDecimal(Number(value))}</strong>
              </article>
            ))}
          </div>

          <div className="notice">
            契稅以房屋評定現值計算，且只針對建物課徵，土地不課契稅；不是以成交價直接計算。
          </div>

          <a className="button" href="https://line.me/ti/p/abQv5LYzzE" target="_blank" rel="noreferrer">
            Line 阿勇諮詢
          </a>
        </>
      ) : null}
    </div>
  );
}
