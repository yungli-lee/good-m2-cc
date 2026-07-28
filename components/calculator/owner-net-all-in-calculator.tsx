"use client";

import { useMemo, useState } from "react";
import { calculateSellerCarryCosts, type SellerCarryCostsInput, validateSellerCarryCostsInput } from "@/lib/calculators/seller";
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

type Props = { mode?: "public" | "admin"; className?: string };

function formatHoldingPeriod(days: number) {
  return `${Math.floor(days / 365)} 年 ${Math.floor((days % 365) / 30)} 個月（${days} 天）`;
}

export function OwnerNetAllInCalculator({ className, mode = "admin" }: Props = {}) {
  const [targetNetWan, setTargetNetWan] = useState("1000");
  const [purchaseDate, setPurchaseDate] = useState("2023-05-03");
  const [saleDate, setSaleDate] = useState("2026-06-22");
  const [originalCostWan, setOriginalCostWan] = useState("800");
  const [purchaseBrokerFeeWan, setPurchaseBrokerFeeWan] = useState("16");
  const [improvementCostsWan, setImprovementCostsWan] = useState("20");
  const [saleBrokerFeeRatePercent, setSaleBrokerFeeRatePercent] = useState("4");
  const [landValueIncrementTaxWan, setLandValueIncrementTaxWan] = useState("30");
  const [notaryAndMiscWan, setNotaryAndMiscWan] = useState("3");
  const [settlementFeeWan, setSettlementFeeWan] = useState("2");
  const [otherFeesWan, setOtherFeesWan] = useState("0");
  const [houseLandTaxRatePercent, setHouseLandTaxRatePercent] = useState("35");

  const input: SellerCarryCostsInput = useMemo(() => ({
    targetNetWan: toNumber(targetNetWan),
    purchaseDate,
    saleDate,
    originalCostWan: toNumber(originalCostWan),
    purchaseBrokerFeeWan: toNumber(purchaseBrokerFeeWan),
    improvementCostsWan: toNumber(improvementCostsWan),
    saleBrokerFeeRatePercent: toNumber(saleBrokerFeeRatePercent),
    landValueIncrementTaxWan: toNumber(landValueIncrementTaxWan),
    notaryAndMiscWan: toNumber(notaryAndMiscWan),
    settlementFeeWan: toNumber(settlementFeeWan),
    otherFeesWan: toNumber(otherFeesWan),
    houseLandTaxRatePercent: toNumber(houseLandTaxRatePercent)
  }), [houseLandTaxRatePercent, improvementCostsWan, landValueIncrementTaxWan, notaryAndMiscWan, originalCostWan, otherFeesWan, purchaseBrokerFeeWan, purchaseDate, saleBrokerFeeRatePercent, saleDate, settlementFeeWan, targetNetWan]);

  const validationMessage = validateSellerCarryCostsInput(input);
  const result = validationMessage ? null : calculateSellerCarryCosts(input, "allFeesAdded");

  return (
    <div className={className} style={{ display: "grid", gap: 18 }}>
      <div className="card">
        <div className="card-body">
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label className="field"><span>屋主目標實拿金額（萬元）</span><input className="input" type="number" min="0" step="0.1" value={targetNetWan} onChange={(event) => setTargetNetWan(event.target.value)} /></label>
            <label className="field"><span>取得日期</span><input className="input" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /></label>
            <label className="field"><span>預計出售日期</span><input className="input" type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label>
            <label className="field"><span>原始取得成本（萬元）</span><input className="input" type="number" min="0" step="0.1" value={originalCostWan} onChange={(event) => setOriginalCostWan(event.target.value)} /></label>
            <label className="field"><span>買入仲介費（萬元）</span><input className="input" type="number" min="0" step="0.1" value={purchaseBrokerFeeWan} onChange={(event) => setPurchaseBrokerFeeWan(event.target.value)} /></label>
            <label className="field"><span>裝修及其他必要支出（萬元）</span><input className="input" type="number" min="0" step="0.1" value={improvementCostsWan} onChange={(event) => setImprovementCostsWan(event.target.value)} /></label>
            <label className="field"><span>出售仲介服務費率（%）</span><input className="input" type="number" min="0" max="99" step="0.1" value={saleBrokerFeeRatePercent} onChange={(event) => setSaleBrokerFeeRatePercent(event.target.value)} /></label>
            <label className="field"><span>土地增值稅（萬元）</span><input className="input" type="number" min="0" step="0.1" value={landValueIncrementTaxWan} onChange={(event) => setLandValueIncrementTaxWan(event.target.value)} /></label>
            <label className="field"><span>代書與雜支（萬元）</span><input className="input" type="number" min="0" step="0.1" value={notaryAndMiscWan} onChange={(event) => setNotaryAndMiscWan(event.target.value)} /></label>
            <label className="field"><span>清償相關費用（萬元）</span><input className="input" type="number" min="0" step="0.1" value={settlementFeeWan} onChange={(event) => setSettlementFeeWan(event.target.value)} /></label>
            <label className="field"><span>其他費用（萬元）</span><input className="input" type="number" min="0" step="0.1" value={otherFeesWan} onChange={(event) => setOtherFeesWan(event.target.value)} /></label>
            <label className="field"><span>房地合一稅率（%）</span><input className="input" type="number" min="0" max="99" step="0.1" value={houseLandTaxRatePercent} onChange={(event) => setHouseLandTaxRatePercent(event.target.value)} /></label>
          </form>
        </div>
      </div>

      {validationMessage ? <div className="notice">{validationMessage}</div> : null}

      {result ? (
        <div className="grid" aria-live="polite">
          <ResultCard label="建議成交總價" value={formatWanDecimal(result.suggestedSalePriceWan)} />
          <ResultCard label="屋主目標實拿" value={formatWanDecimal(input.targetNetWan)} />
          <ResultCard label="預估出售仲介服務費" value={formatWanDecimal(result.saleBrokerFeeWan)} />
          <ResultCard label="預估房地合一稅" value={formatWanDecimal(result.houseLandTaxWan)} />
          <ResultCard label="土地增值稅" value={formatWanDecimal(result.landValueIncrementTaxWan)} />
          <ResultCard label="代書與雜支" value={formatWanDecimal(result.notaryAndMiscWan)} />
          <ResultCard label="清償相關費用" value={formatWanDecimal(result.settlementFeeWan)} />
          <ResultCard label="其他費用" value={formatWanDecimal(result.otherFeesWan)} />
          <ResultCard label="預估總費用" value={formatWanDecimal(result.totalFeesWan)} />
          <ResultCard label="預估實拿金額" value={formatWanDecimal(result.ownerNetWan)} />
          <ResultCard label="實拿金額與目標差額" value={formatWanDecimal(result.verificationDifferenceWan)} />
          <ResultCard label="持有期間" value={formatHoldingPeriod(result.holdingPeriodDays)} />
          <ResultCard label="使用的房地合一稅率" value={`${result.houseLandTaxRatePercent}%`} />
        </div>
      ) : null}

      <div className="notice">{mode === "public" ? "本試算結果僅供初步評估，實際稅額仍須依取得原因、可列舉成本、持有期間、土地漲價總數額及稅務機關認定為準。" : "本工具為估算輔助，實際稅費仍應依地政、稅捐、代書及國稅局資料為準。"}</div>
    </div>
  );
}
