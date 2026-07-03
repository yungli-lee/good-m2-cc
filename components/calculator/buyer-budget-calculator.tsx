"use client";

import { useMemo, useState } from "react";
import { calculateBuyerBudget, type BuyerBudgetInput, validateBuyerBudgetInput } from "@/lib/calculators/buyer";
import { formatWanDecimal } from "@/lib/calculators/format";

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toOptionalNumber(value: string) {
  if (value.trim() === "") return null;
  return toNumber(value);
}

function formatWanInteger(value: number) {
  return `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Math.round(value))} 萬元`;
}

function suggestedPriceRangeWan(maxOfferWan: number) {
  const lowerWan = Math.max(0, Math.floor(maxOfferWan / 100) * 100);
  const upperWan = Math.ceil(maxOfferWan / 10) * 10;
  return `${new Intl.NumberFormat("zh-TW").format(lowerWan)}～${new Intl.NumberFormat("zh-TW").format(upperWan)} 萬`;
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="card">
      <div className="card-body">
        <div className="muted">{label}</div>
        <strong style={{ display: "block", marginTop: 8, color: "#102343", fontSize: 24 }}>{value}</strong>
      </div>
    </article>
  );
}

export function BuyerBudgetCalculator() {
  const [availableCashWan, setAvailableCashWan] = useState("300");
  const [loanLimitWan, setLoanLimitWan] = useState("");
  const [loanToValuePercent, setLoanToValuePercent] = useState("75");
  const [buyerBrokerFeeRatePercent, setBuyerBrokerFeeRatePercent] = useState("2");
  const [deedTaxWan, setDeedTaxWan] = useState("10");
  const [notaryAndRegistrationWan, setNotaryAndRegistrationWan] = useState("3");
  const [escrowFeeWan, setEscrowFeeWan] = useState("1");
  const [renovationBudgetWan, setRenovationBudgetWan] = useState("30");
  const [furnitureBudgetWan, setFurnitureBudgetWan] = useState("10");
  const [cashReserveWan, setCashReserveWan] = useState("20");
  const [otherFeesWan, setOtherFeesWan] = useState("0");

  const input: BuyerBudgetInput = useMemo(() => ({
    availableCashWan: toNumber(availableCashWan),
    loanLimitWan: toOptionalNumber(loanLimitWan),
    loanToValuePercent: toNumber(loanToValuePercent),
    buyerBrokerFeeRatePercent: toNumber(buyerBrokerFeeRatePercent),
    deedTaxWan: toNumber(deedTaxWan),
    notaryAndRegistrationWan: toNumber(notaryAndRegistrationWan),
    escrowFeeWan: toNumber(escrowFeeWan),
    renovationBudgetWan: toNumber(renovationBudgetWan),
    furnitureBudgetWan: toNumber(furnitureBudgetWan),
    cashReserveWan: toNumber(cashReserveWan),
    otherFeesWan: toNumber(otherFeesWan)
  }), [availableCashWan, buyerBrokerFeeRatePercent, cashReserveWan, deedTaxWan, escrowFeeWan, furnitureBudgetWan, loanLimitWan, loanToValuePercent, notaryAndRegistrationWan, otherFeesWan, renovationBudgetWan]);

  const validationMessage = validateBuyerBudgetInput(input);
  const result = validationMessage ? null : calculateBuyerBudget(input);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="card">
        <div className="card-body">
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label className="field"><span>可用自備款（萬元）</span><input className="input" type="number" min="0" step="0.1" value={availableCashWan} onChange={(event) => setAvailableCashWan(event.target.value)} /></label>
            <label className="field"><span>預估貸款成數（%）</span><input className="input" type="number" min="1" max="100" step="0.1" value={loanToValuePercent} onChange={(event) => setLoanToValuePercent(event.target.value)} /></label>
            <label className="field"><span>買方仲介服務費率（%）</span><input className="input" type="number" min="0" max="99" step="0.1" value={buyerBrokerFeeRatePercent} onChange={(event) => setBuyerBrokerFeeRatePercent(event.target.value)} /></label>
            <label className="field"><span>貸款上限金額（萬元，可選）</span><input className="input" type="number" min="0" step="0.1" value={loanLimitWan} onChange={(event) => setLoanLimitWan(event.target.value)} /></label>
            <label className="field"><span>契稅（萬元）</span><input className="input" type="number" min="0" step="0.1" value={deedTaxWan} onChange={(event) => setDeedTaxWan(event.target.value)} /></label>
            <label className="field"><span>代書與規費（萬元）</span><input className="input" type="number" min="0" step="0.1" value={notaryAndRegistrationWan} onChange={(event) => setNotaryAndRegistrationWan(event.target.value)} /></label>
            <label className="field"><span>履保費（萬元）</span><input className="input" type="number" min="0" step="0.1" value={escrowFeeWan} onChange={(event) => setEscrowFeeWan(event.target.value)} /></label>
            <label className="field"><span>裝潢預算（萬元，可選）</span><input className="input" type="number" min="0" step="0.1" value={renovationBudgetWan} onChange={(event) => setRenovationBudgetWan(event.target.value)} /></label>
            <label className="field"><span>家具家電預算（萬元，可選）</span><input className="input" type="number" min="0" step="0.1" value={furnitureBudgetWan} onChange={(event) => setFurnitureBudgetWan(event.target.value)} /></label>
            <label className="field"><span>預留現金（萬元，可選）</span><input className="input" type="number" min="0" step="0.1" value={cashReserveWan} onChange={(event) => setCashReserveWan(event.target.value)} /></label>
            <label className="field"><span>其他費用（萬元）</span><input className="input" type="number" min="0" step="0.1" value={otherFeesWan} onChange={(event) => setOtherFeesWan(event.target.value)} /></label>
          </form>
        </div>
      </div>

      {validationMessage ? <div className="notice">{validationMessage}</div> : null}

      {result ? (
        <>
          <section className="card" aria-live="polite">
            <div className="card-body" style={{ display: "grid", gap: 10 }}>
              <div className="muted">您的可購屋價格</div>
              <strong style={{ color: "#102343", fontSize: 44, lineHeight: 1.1 }}>{formatWanInteger(result.maxOfferWan)}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 16 }}>
                依目前貸款成數與購屋成本估算，建議優先看 {suggestedPriceRangeWan(result.maxOfferWan)}價位物件。
              </p>
            </div>
          </section>

          <div className="grid">
            <ResultCard label="預估成交價" value={formatWanDecimal(result.maxOfferWan)} />
            <ResultCard label="預估貸款金額" value={formatWanDecimal(result.estimatedLoanWan)} />
            <ResultCard label="預估自備款" value={formatWanDecimal(result.requiredCashWan)} />
            <ResultCard label="購屋相關費用" value={formatWanDecimal(result.purchaseExtraCostsWan)} />
            <ResultCard label="建議準備現金" value={formatWanDecimal(result.cashUsedWan)} />
          </div>
          {result.suggestedOfferReductionWan > 0 ? (
            <div className="notice">此組條件已超出可用自備款，建議至少降低出價 {formatWanDecimal(result.suggestedOfferReductionWan)}。</div>
          ) : null}
        </>
      ) : null}

      <div className="notice">實際貸款成數仍依銀行估價、買方信用、收入、負債比及授信政策為準。</div>
      <div className="notice">本工具為估算輔助，實際稅費仍應依地政、稅捐、代書及國稅局資料為準。</div>
    </div>
  );
}
