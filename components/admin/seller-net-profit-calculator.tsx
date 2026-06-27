"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateSellerNetProfit,
  getSellerTaxRatePercent,
  type SellerNetProfitInput,
  validateSellerNetProfitInput
} from "@/lib/calculators/seller-net-profit";
import { formatWan } from "@/lib/calculators/format";

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInput(
  purchaseDate: string,
  saleDate: string,
  purchasePriceWan: string,
  purchaseBrokerFeeWan: string,
  improvementCostsWan: string,
  saleBrokerFeeRatePercent: string,
  targetNetProfitWan: string,
  taxRatePercent: string
): SellerNetProfitInput {
  return {
    improvementCostsWan: toNumber(improvementCostsWan),
    purchaseDate,
    saleDate,
    purchaseBrokerFeeWan: toNumber(purchaseBrokerFeeWan),
    purchasePriceWan: toNumber(purchasePriceWan),
    saleBrokerFeeRatePercent: toNumber(saleBrokerFeeRatePercent),
    targetNetProfitWan: toNumber(targetNetProfitWan),
    taxRatePercent: toNumber(taxRatePercent)
  };
}

export function SellerNetProfitCalculator() {
  const [purchaseDate, setPurchaseDate] = useState("2023-05-03");
  const [saleDate, setSaleDate] = useState("2026-06-22");
  const [purchasePriceWan, setPurchasePriceWan] = useState("800");
  const [purchaseBrokerFeeWan, setPurchaseBrokerFeeWan] = useState("16");
  const [improvementCostsWan, setImprovementCostsWan] = useState("0");
  const [saleBrokerFeeRatePercent, setSaleBrokerFeeRatePercent] = useState("4");
  const [targetNetProfitWan, setTargetNetProfitWan] = useState("200");
  const [taxRatePercent, setTaxRatePercent] = useState("35");
  const [manualTaxRate, setManualTaxRate] = useState(false);

  const autoTaxRate = useMemo(() => getSellerTaxRatePercent(purchaseDate, saleDate), [purchaseDate, saleDate]);

  useEffect(() => {
    if (!manualTaxRate) {
      setTaxRatePercent(String(autoTaxRate));
    }
  }, [autoTaxRate, manualTaxRate]);

  const input = useMemo(() => toInput(
    purchaseDate,
    saleDate,
    purchasePriceWan,
    purchaseBrokerFeeWan,
    improvementCostsWan,
    saleBrokerFeeRatePercent,
    targetNetProfitWan,
    taxRatePercent
  ), [
    purchaseDate,
    saleDate,
    purchasePriceWan,
    purchaseBrokerFeeWan,
    improvementCostsWan,
    saleBrokerFeeRatePercent,
    targetNetProfitWan,
    taxRatePercent
  ]);

  const validationMessage = validateSellerNetProfitInput(input);
  const result = validationMessage ? null : calculateSellerNetProfit(input);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="card">
        <div className="card-body">
          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>買入日期</span>
              <input className="input" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
            </label>
            <label className="field">
              <span>預計出售日期</span>
              <input className="input" type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
            </label>
            <label className="field">
              <span>買入價格（萬元）</span>
              <input className="input" type="number" min="0" step="1" value={purchasePriceWan} onChange={(event) => setPurchasePriceWan(event.target.value)} />
            </label>
            <label className="field">
              <span>買入仲介費（萬元）</span>
              <input className="input" type="number" min="0" step="1" value={purchaseBrokerFeeWan} onChange={(event) => setPurchaseBrokerFeeWan(event.target.value)} />
            </label>
            <label className="field">
              <span>裝修及其他必要支出（萬元）</span>
              <input className="input" type="number" min="0" step="1" value={improvementCostsWan} onChange={(event) => setImprovementCostsWan(event.target.value)} />
            </label>
            <label className="field">
              <span>出售仲介費率（%）</span>
              <input className="input" type="number" min="0" max="99" step="0.1" value={saleBrokerFeeRatePercent} onChange={(event) => setSaleBrokerFeeRatePercent(event.target.value)} />
            </label>
            <label className="field">
              <span>目標稅後淨利（萬元）</span>
              <input className="input" type="number" min="0" step="1" value={targetNetProfitWan} onChange={(event) => setTargetNetProfitWan(event.target.value)} />
            </label>
            <label className="field">
              <span>房地合一稅率（%）</span>
              <input
                className="input"
                type="number"
                min="0"
                max="99"
                step="0.1"
                value={taxRatePercent}
                onChange={(event) => {
                  setManualTaxRate(true);
                  setTaxRatePercent(event.target.value);
                }}
              />
            </label>
            <div className="field">
              <span className="muted">自動帶入稅率</span>
              <button
                className="button ghost"
                type="button"
                onClick={() => {
                  setManualTaxRate(false);
                  setTaxRatePercent(String(autoTaxRate));
                }}
              >
                使用 {autoTaxRate}%
              </button>
            </div>
          </form>
        </div>
      </div>

      {validationMessage ? <div className="notice">{validationMessage}</div> : null}

      {result ? (
        <div className="grid" aria-live="polite">
          {[
            ["建議最低成交價", formatWan(result.minimumSalePriceWan)],
            ["裝修及其他必要支出", formatWan(result.improvementCostsWan)],
            ["預估出售仲介費", formatWan(result.saleBrokerFeeWan)],
            ["預估房地合一稅", formatWan(result.taxAmountWan)],
            ["預估稅後淨利", formatWan(result.targetNetProfitWan)],
            ["持有期間", result.holdingPeriod],
            ["適用稅率", `${result.taxRatePercent}%`]
          ].map(([label, value]) => (
            <article className="card" key={label}>
              <div className="card-body">
                <div className="muted">{label}</div>
                <strong style={{ display: "block", marginTop: 8, color: "#102343", fontSize: 24 }}>{value}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="notice">
        本試算為簡化估算，未納入土地增值稅、土地漲價總數額扣除、裝修費、代書費、規費、貸款違約金、持有期間成本、重購退稅、符合自住房地優惠稅率等因素。實際稅額與淨利仍應依個案資料與專業稅務試算為準。
      </div>
    </div>
  );
}
