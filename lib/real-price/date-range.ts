/** Accept ROC compact dates (1100101) or Gregorian ISO dates. */
export function parseSearchDate(input: string): string | null {
  const value=input.normalize("NFKC").trim();
  let year:number, month:number, day:number;
  if (/^\d{7}$/.test(value)) {
    year=Number(value.slice(0,3))+1911;month=Number(value.slice(3,5));day=Number(value.slice(5,7));
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [year,month,day]=value.split("-").map(Number);
  } else return null;
  if(year<1912||year>9999)return null;
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
