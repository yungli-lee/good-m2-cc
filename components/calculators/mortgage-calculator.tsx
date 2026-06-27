"use client";

import { useMemo, useState } from "react";
import { calculateMortgage, type MortgageInput, validateMortgageInput } from "@/lib/calculators/mortgage";
import { formatTwd } from "@/lib/calculators/format";

type RateFormState = {
  rate: string;
  startMonth: string;
};

const initialRates: [RateFormState, RateFormState, RateFormState] = [
  { rate: "1.775", startMonth: "1" },
  { rate: "2.000", startMonth: "37" },
  { rate: "2.300", startMonth: "85" }
];

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function toMortgageInput(amountWan: string, years: string, graceMonths: string, rates: [RateFormState, RateFormState, RateFormState]): MortgageInput {
  return {
    amountWan: Number(amountWan),
    years: Number(years),
    graceMonths: Number(graceMonths),
    rates: rates.map((rate) => ({
      rate: numberOrNull(rate.rate),
      startMonth: numberOrNull(rate.startMonth)
    })) as MortgageInput["rates"]
  };
}

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
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14
  },
  rateGrid: {
    display: "grid",
    gap: 10
  },
  rateRow: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1fr 1fr",
    gap: 12,
    alignItems: "center"
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
  }
} satisfies Record<string, React.CSSProperties>;

export function MortgageCalculator() {
  const [amountWan, setAmountWan] = useState("1000");
  const [years, setYears] = useState("40");
  const [graceMonths, setGraceMonths] = useState("36");
  const [rates, setRates] = useState(initialRates);

  const input = useMemo(() => toMortgageInput(amountWan, years, graceMonths, rates), [amountWan, years, graceMonths, rates]);
  const validationMessage = validateMortgageInput(input);
  const result = validationMessage ? null : calculateMortgage(input);

  function updateRate(index: number, key: keyof RateFormState, value: string) {
    setRates((current) => current.map((rate, rateIndex) => (
      rateIndex === index ? { ...rate, [key]: value } : rate
    )) as [RateFormState, RateFormState, RateFormState]);
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <form style={pageStyles.panel}>
        <div style={pageStyles.fields}>
          <label className="field">
            <span>貸款金額（萬元）</span>
            <input className="input" type="number" min="1" step="1" value={amountWan} onChange={(event) => setAmountWan(event.target.value)} />
          </label>
          <label className="field">
            <span>貸款年限</span>
            <input className="input" type="number" min="1" max="40" step="1" value={years} onChange={(event) => setYears(event.target.value)} />
          </label>
          <label className="field">
            <span>寬限期（月，0-84）</span>
            <input className="input" type="number" min="0" max="84" step="1" value={graceMonths} onChange={(event) => setGraceMonths(event.target.value)} />
          </label>
        </div>

        <div style={pageStyles.rateGrid} aria-label="三段式利率設定">
          <div style={{ ...pageStyles.rateRow, color: "#64708a", fontSize: 14, fontWeight: 800 }}>
            <span>段別</span>
            <span>年利率（%）</span>
            <span>啟用月份</span>
          </div>
          {rates.map((rate, index) => (
            <label key={index} style={pageStyles.rateRow}>
              <span>第 {index + 1} 段</span>
              <input className="input" type="number" min="0" step="0.001" value={rate.rate} onChange={(event) => updateRate(index, "rate", event.target.value)} />
              <input className="input" type="number" min="1" step="1" value={rate.startMonth} onChange={(event) => updateRate(index, "startMonth", event.target.value)} />
            </label>
          ))}
        </div>
      </form>

      {validationMessage ? <div className="notice">{validationMessage}</div> : null}

      {result ? (
        <>
          <div style={pageStyles.summary} aria-live="polite">
            {[
              ["貸款總額", formatTwd(result.principal)],
              ["貸款期數", `${result.totalMonths} 個月`],
              ["最高月付金", formatTwd(result.maxPayment)],
              ["總利息", formatTwd(result.totalInterest)]
            ].map(([label, value]) => (
              <article key={label} style={pageStyles.summaryCard}>
                <div className="muted">{label}</div>
                <strong style={{ display: "block", marginTop: 8, color: "#102343", fontSize: 24 }}>{value}</strong>
              </article>
            ))}
          </div>

          {result.warning ? <div className="notice">{result.warning}</div> : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>期間</th>
                  <th>利率</th>
                  <th>月付金</th>
                  <th>月付本金</th>
                  <th>月付利息</th>
                  <th>期間本金</th>
                  <th>期間利息</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={`${row.startMonth}-${row.endMonth}`}>
                    <td>{row.label}</td>
                    <td>{row.rate.toFixed(3)}%</td>
                    <td>{formatTwd(row.firstPayment)}</td>
                    <td>{formatTwd(row.firstPrincipal)}</td>
                    <td>{formatTwd(row.firstInterest)}</td>
                    <td>{formatTwd(row.periodPrincipal)}</td>
                    <td>{formatTwd(row.periodInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
