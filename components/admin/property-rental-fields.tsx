"use client";

import { useState } from "react";

type Values = {
  transaction_type?: string | null;
  price?: string | number | null;
  rent_monthly?: string | number | null;
  deposit_months?: string | number | null;
  minimum_lease_months?: string | number | null;
  rental_equipment?: string | null;
  lease_notarization_required?: boolean | null;
};

export function PropertyRentalFields({ values = {}, errors = {}, compact = false }: { values?: Values; errors?: Record<string, string | undefined>; compact?: boolean }) {
  const [transaction, setTransaction] = useState(values.transaction_type || "sale");
  const rent = transaction === "rent";
  return <>
    <div className="field"><label htmlFor="transaction_type">交易類型</label><select className="select" id="transaction_type" name="transaction_type" defaultValue={transaction} onChange={event => setTransaction(event.target.value)}><option value="sale">出售</option><option value="rent">出租</option></select></div>
    <div className="field" hidden={rent}><label htmlFor="price">出售開價（萬元）</label><input className="input" id="price" name="price" type="number" min="0" step="any" disabled={rent} defaultValue={values.price ?? ""} />{errors.price ? <p role="alert">{errors.price}</p> : null}</div>
    <div className="field" hidden={!rent}><label htmlFor="rent_monthly">月租金（元／月）</label><input className="input" id="rent_monthly" name="rent_monthly" type="number" min="1" step="1" disabled={!rent} required={rent && !compact} defaultValue={values.rent_monthly ?? ""} />{errors.rent_monthly ? <p role="alert">{errors.rent_monthly}</p> : null}</div>
    {!compact ? <>
      <div className="field" hidden={!rent}><label htmlFor="deposit_months">押金（月數）</label><input className="input" id="deposit_months" name="deposit_months" type="number" min="0" step="0.5" disabled={!rent} defaultValue={values.deposit_months ?? ""} /></div>
      <div className="field" hidden={!rent}><label htmlFor="minimum_lease_months">最短租期（月數）</label><input className="input" id="minimum_lease_months" name="minimum_lease_months" type="number" min="1" step="1" disabled={!rent} defaultValue={values.minimum_lease_months ?? ""} /><small>三年請填 36 個月。</small></div>
      <div className="field" hidden={!rent}><label htmlFor="rental_equipment">附帶設備／租賃條件</label><textarea className="textarea" id="rental_equipment" name="rental_equipment" rows={4} disabled={!rent} defaultValue={values.rental_equipment ?? ""} /></div>
      <div className="field" hidden={!rent}><label><input type="checkbox" name="lease_notarization_required" disabled={!rent} defaultChecked={Boolean(values.lease_notarization_required)} /> 租約須經公證</label></div>
    </> : null}
  </>;
}
