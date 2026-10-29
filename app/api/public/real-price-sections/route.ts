import { NextResponse } from "next/server";
export const runtime = "edge";

const countyCodes: Record<string,string> = {
  "臺北市":"A","臺中市":"B","基隆市":"C","臺南市":"D","高雄市":"E","新北市":"F",
  "宜蘭縣":"G","桃園市":"H","嘉義市":"I","新竹縣":"J","苗栗縣":"K","南投縣":"M",
  "彰化縣":"N","新竹市":"O","雲林縣":"P","嘉義縣":"Q","屏東縣":"T","花蓮縣":"U",
  "臺東縣":"V","金門縣":"W","澎湖縣":"X","連江縣":"Z"
};
const decode=(s:string)=>s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n:string)=>String.fromCodePoint(Number(n))).trim();
async function officialXml(path:string,signal:AbortSignal){
  const response=await fetch(`https://api.nlsc.gov.tw/other/${path}`,{signal,headers:{Accept:"application/xml,text/xml"},next:{revalidate:86400}});
  if(!response.ok)throw new Error("upstream_unavailable");
  const xml=await response.text();
  if(xml.length>500000)throw new Error("response_too_large");
  return xml;
}
// Official NLSC ListTown + ListLandSection; no transaction database scans.
export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const county=params.get("county")||"",district=params.get("district")||"";
  const code=countyCodes[county];
  if(!code||!district||district.length>80)return NextResponse.json({error:"invalid_area"},{status:400});
  try{
    const signal=AbortSignal.timeout(8000);
    const towns=await officialXml(`ListTown/${code}`,signal);
    const town=[...towns.matchAll(/<townItem>([\s\S]*?)<\/townItem>/gi)].find(m=>decode(m[1].match(/<townname>([^<]+)<\/townname>/i)?.[1]||"")===district);
    const townCode=town?.[1].match(/<towncode>([A-Z][0-9]{2})<\/towncode>/i)?.[1];
    if(!townCode)return NextResponse.json({error:"invalid_district"},{status:400});
    const xml=await officialXml(`ListLandSection/${code}/${townCode}`,signal);
    const sections=[...new Set([...xml.matchAll(/<sectstr>([^<]+)<\/sectstr>/gi)].map(m=>decode(m[1])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh-Hant"));
    if(!sections.length)throw new Error("sections_missing");
    return NextResponse.json({county,district,sections,source:"NLSC ListLandSection"},{headers:{"Cache-Control":"public, max-age=86400"}});
  }catch{
    return NextResponse.json({error:"section_list_unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
