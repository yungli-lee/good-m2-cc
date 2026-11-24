/**
 * M2 rectangle-query contract. Preview only: no mock transaction is ever
 * labelled as an official transaction, and no address-only row is considered
 * inside a selected bounding box.
 */
export type MapBounds = { south:number; west:number; north:number; east:number };
export type SourceKind = "official" | "sample";
export type TransactionKind = "land" | "building";
export type LocatedTransaction = {
  id:string;
  source:SourceKind;
  kind:TransactionKind;
  latitude:number|null;
  longitude:number|null;
  transactionDate:string|null;
  totalPrice:number|null;
  landPing:number|null;
  buildingPing:number|null;
  buildingAgeYears:number|null;
  floorDescription:string|null;
  landUnitPrice:number|null;
  officialRemark:string|null;
  sourceOrder:number;
};
export type QueryState =
 | {status:"idle"}
 | {status:"loading"}
 | {status:"error";message:string}
 | {status:"success";source:SourceKind;rows:LocatedTransaction[];total:number};

export const PAGE_SIZES=[5,10,15,20] as const;
export type PageSize=typeof PAGE_SIZES[number];
export const DEFAULT_PAGE_SIZE:PageSize=10;

export function validBounds(b:MapBounds):boolean {
 return [b.south,b.west,b.north,b.east].every(Number.isFinite)
  && b.south>=-90 && b.north<=90 && b.west>=-180 && b.east<=180
  && b.south<b.north && b.west<b.east;
}
export function insideBounds(row:LocatedTransaction,b:MapBounds):boolean {
 return validBounds(b) && row.latitude!==null && row.longitude!==null
  && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
  && row.latitude>=b.south && row.latitude<=b.north
  && row.longitude>=b.west && row.longitude<=b.east;
}
/** Strictly excludes records without defensible point coordinates. */
export function selectTransactions(rows:LocatedTransaction[],b:MapBounds,size:PageSize=DEFAULT_PAGE_SIZE):LocatedTransaction[] {
 if(!validBounds(b))return [];
 return rows.filter(row=>insideBounds(row,b))
  .sort((a,c)=>a.sourceOrder-c.sourceOrder)
  .slice(0,size);
}
export function transactionColumns(kind:TransactionKind):readonly string[] {
 return kind==="land"
  ? ["交易日期","總價","地坪","土地每坪單價","官方備註"]
  : ["交易日期","總價","地坪","建坪","屋齡","樓高","官方備註"];
}
export function sourceNotice(source:SourceKind):string {
 return source==="official"
  ? "官方成交資料：仍須逐筆核對來源、座標精度及原始備註。"
  : "測試樣本：非內政部官方成交紀錄，不得作為實際成交行情或對外報告。";
}
