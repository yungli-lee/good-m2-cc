"use client";

import { useMemo, useState } from "react";
import { calculateBuyerBudget, type BuyerBudgetInput, validateBuyerBudgetInput } from "@/lib/calculators/buyer";
import { formatWanDecimal } from "@/lib/calculators/format";

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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
  const [loanAmountWan, setLoanAmountWan] = useState("900");
  const [loanToValuePercent, setLoanToValuePercent] = useState("75");
  const [buyerBrokerFeeRatePercent, setBuyerBrokerFeeRatePercent] = useState("2");
  const [deedTaxWan, setDeedTaxWan] = useState("12");
  const [notaryAndRegistrationWan, setNotaryAndRegistrationWan] = useState("3");
  const [escrowFeeWan, setEscrowFeeWan] = useState("1");
  const [renovationBudgetWan, setRenovationBudgetWan] = useState("30");
  const [furnitureBudgetWan, setFurnitureBudgetWan] = useState("10");
  const [cashReserveWan, setCashReserveWan] = useState("20");
  const [otherFeesWan, setOtherFeesWan] = useState("0");

  const input: BuyerBudgetInput = useMemo(() => ({
    availableCashWan: toNumber(availableCashWan),
    loanAmountWan: toNumber(loanAmountWan),
    loanToValuePercent: toNumber(loanToValuePercent),
    buyerBrokerFeeRatePercent: toNumber(buyerBrokerFeeRatePercent),
    deedTaxWan: toNumber(deedTaxWan),
    notaryAndRegistrationWan: toNumber(notaryAndRegistrationWan),
    escrowFeeWan: toNumber(escrowFeeWan),
    renovationBudgetWan: toNumber(renovationBudgetWan),
    furnitureBudgetWan: toNumber(furnitureBudgetWan),
    cashReserveWan: toNumber(cashReserveWan),
    otherFeesWan: toNumber(otherFeesWan)
  }), [availableCashWan, buyerBrokerFeeRatePercent, cashReserveWan, deedTaxWan, escrowFeeWan, furnitureBudgetWan, loanAmountWan, loanToValuePercent, notaryAndRegistrationWan, otherFeesWan, renovationBudgetWan]);

  const validationMessage = validateBuyerBudgetInput(input);
  const result = validationMessage ? null : calculateBuyerBudget(input);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="card">
        <div className="card-body">
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label className="field"><span>可用自備款（萬元）</span><input className="input" type="number" min="0" step="0.1" value={availableCashWan} onChange={(event) => setAvailableCashWan(event.target.value)} /></label>
            <label className="field"><span>可貸款金額（萬元）</span><input className="input" type="number" min="0" step="0.1" value={loanAmountWan} onChange={(event) => setLoanAmountWan(event.target.value)} /></label>
            <label className="field"><span>預估貸款成數（%）</span><input className="input" type="number" min="1" max="100" step="0.1" value={loanToValuePercent} onChange={(event) => setLoanToValuePercent(event.target.value)} /></label>
            <label className="field"><span>買方仲介服務費率（%）</span><input className="input" type="number" min="0" max="99" step="0.1" value={buyerBrokerFeeRatePercent} onChange={(event) => setBuyerBrokerFeeRatePercent(event.target.value)} /></label>
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
          <div className="grid" aria-live="polite">
            <ResultCard label="買方最高可出價" value={formatWanDecimal(result.maxOfferWan)} />
            <ResultCard label="預估貸款金額" value={formatWanDecimal(result.estimatedLoanWan)} />
            <ResultCard label="需準備自備款" value={formatWanDecimal(result.requiredCashWan)} />
            <ResultCard label="買方仲介費" value={formatWanDecimal(result.buyerBrokerFeeWan)} />
            <ResultCard label="購屋附加成本合計" value={formatWanDecimal(result.purchaseExtraCostsWan)} />
            <ResultCard label="買方總資金需求" value={formatWanDecimal(result.totalFundingNeedWan)} />
            <ResultCard label="安全預算差額" value={formatWanDecimal(result.safetyGapWan)} />
          </div>
          {result.suggestedOfferReductionWan > 0 ? (
            <div className="notice">此組條件已超出總預算，建議至少降低出價 {formatWanDecimal(result.suggestedOfferReductionWan)}。</div>
          ) : null}
        </>
      ) : null}

      <div className="notice">本工具為估算輔助，實際稅費仍應依地政、稅捐、代書及國稅局資料為準。</div>
    </div>
  );
}
