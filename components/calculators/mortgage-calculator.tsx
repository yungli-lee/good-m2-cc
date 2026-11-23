"use client";

import { useMemo, useState } from "react";
import { calculateMortgage, type MortgageInput, validateMortgageInput } from "@/lib/calculators/mortgage";
import { formatTwd } from "@/lib/calculators/format";

type RateFormState = {
  rate: string;
  startMonth: string;
};

const initialRates: RateFormState[] = [
  { rate: "1.775", startMonth: "1" },
  { rate: "2.000", startMonth: "37" },
  { rate: "2.300", startMonth: "85" }
];

// 青安 3.0：115/8/1 起新申辦之一段式機動利率，假設基準利率不變。
const youthLoan3Rates: RateFormState[] = [
  { rate: "1.775", startMonth: "1" },
  { rate: "1.900", startMonth: "37" },
  { rate: "2.025", startMonth: "49" },
  { rate: "2.150", startMonth: "61" },
  { rate: "2.275", startMonth: "73" }
];

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function toMortgageInput(amountWan: string, years: string, graceMonths: string, rates: RateFormState[]): MortgageInput {
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
  const [rateMode, setRateMode] = useState<"custom" | "youth3">("custom");

  const input = useMemo(() => toMortgageInput(amountWan, years, graceMonths, rates), [amountWan, years, graceMonths, rates]);
  const validationMessage = validateMortgageInput(input);
  const result = validationMessage ? null : calculateMortgage(input);

  function updateRate(index: number, key: keyof RateFormState, value: string) {
    setRateMode("custom");
    setRates((current) => current.map((rate, rateIndex) => (
      rateIndex === index ? { ...rate, [key]: value } : rate
    )));
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <form style={pageStyles.panel} onSubmit={(event) => event.preventDefault()}>
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => { setRateMode("youth3"); setRates(youthLoan3Rates.map((r) => ({ ...r }))); }}
            aria-pressed={rateMode === "youth3"}
            style={{ padding: "10px 16px", border: "1px solid #244e86", borderRadius: 8, background: rateMode === "youth3" ? "#173966" : "#fff", color: rateMode === "youth3" ? "#fff" : "#173966", fontWeight: 700, cursor: "pointer" }}>
            🏠 一鍵套用青安 3.0 利率
          </button>
          <button type="button" onClick={() => { setRateMode("custom"); setRates(initialRates.map((r) => ({ ...r }))); }}
            aria-pressed={rateMode === "custom"}
            style={{ padding: "10px 16px", border: "1px solid #cbd5e1", borderRadius: 8, background: rateMode === "custom" ? "#e9eef5" : "#fff", color: "#173966", cursor: "pointer" }}>
            恢復自訂三段利率
          </button>
        </div>
        {rateMode === "youth3" ? (
          <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
            青安 3.0（2026/8/1 起新申辦）試算：撥款後第 1～3 年 1.775%、第 4 年 1.900%、第 5 年 2.025%、第 6 年 2.150%、第 7 年起 2.275%。
            利率為基準利率不變時之參考值，實際利率將隨指標利率調整；申貸資格、貸款額度及寬限期仍以承貸銀行審核為準。
            <a href="https://www.nta.gov.tw/singlehtml/109" target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>財政部官方說明</a>
          </p>
        ) : null}
        {rateMode === "youth3" && Number(graceMonths) > 60 ? (
          <div className="notice">青安 3.0 寬限期最長 5 年（60 個月），請調整寬限期以符合方案條件。</div>
        ) : null}
        {rateMode === "youth3" && Number(amountWan) > 1000 ? (
          <div className="notice">貸款超過一般戶 1,000 萬元上限；較高額度須符合婚育家庭等特定資格，請向銀行確認。</div>
        ) : null}
        <div style={pageStyles.rateGrid} aria-label="分段利率設定">
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
