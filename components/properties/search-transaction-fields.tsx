"use client";
import { useState } from "react";
export function SearchTransactionFields({ transaction = "sale", minPrice, maxPrice }: { transaction?: "sale" | "rent" | "all"; minPrice?: number; maxPrice?: number }) {
  const [kind, setKind] = useState(transaction);
  const [minimum, setMinimum] = useState(minPrice == null ? "" : String(minPrice));
  const [maximum, setMaximum] = useState(maxPrice == null ? "" : String(maxPrice));
  const unit = kind === "rent" ? "月租（元）" : "總價（萬元）";
  return <><label>交易類型<select className="select" name="transaction" value={kind} onChange={event => { setKind(event.target.value as typeof kind); setMinimum(""); setMaximum(""); }}><option value="sale">出售</option><option value="rent">出租</option><option value="all">出售與出租</option></select></label><div className="collection-price-fields"><label>最低{unit}<input className="input" name="price_min" type="number" min="0" max="100000000" step="any" value={minimum} disabled={kind === "all"} onChange={event => setMinimum(event.target.value)} /></label><label>最高{unit}<input className="input" name="price_max" type="number" min="0" max="100000000" step="any" value={maximum} disabled={kind === "all"} onChange={event => setMaximum(event.target.value)} /></label></div></>;
}
