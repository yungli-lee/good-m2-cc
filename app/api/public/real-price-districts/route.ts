import { NextResponse } from "next/server";
export const runtime = "edge";

// Official NLSC land-administration code service: https://api.nlsc.gov.tw/other/ListTown/{countyCode}
const codeByCounty: Record<string,string> = {
 "臺北市":"A","臺中市":"B","基隆市":"C","臺南市":"D","高雄市":"E","新北市":"F",
 "宜蘭縣":"G","桃園市":"H","嘉義市":"I","新竹縣":"J","苗栗縣":"K","南投縣":"M",
 "彰化縣":"N","新竹市":"O","雲林縣":"P","嘉義縣":"Q","屏東縣":"T","花蓮縣":"U",
 "臺東縣":"V","金門縣":"W","澎湖縣":"X","連江縣":"Z"
};
function unescapeXml(value:string) { return value.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n:string)=>String.fromCharCode(Number(n))).trim(); }
export async function GET(request: Request) {
 const county=new URL(request.url).searchParams.get("county")||"";
 const code=codeByCounty[county];
 if(!code) return NextResponse.json({error:"invalid_county"},{status:400});
 try {
   const response=await fetch(`https://api.nlsc.gov.tw/other/ListTown/${code}`, {headers:{Accept:"application/xml,text/xml"},signal:AbortSignal.timeout(6000),next:{revalidate:86400}});
   if(!response.ok) throw new Error("upstream_unavailable");
   const xml=await response.text();
   if(xml.length>500000)throw new Error("response_too_large");
   // Extract the official townname element, not display text inferred from a transaction address.
   const names=[...xml.matchAll(/<townname(?:\s+[^>]*)?>([^<]+)<\/townname>/gi)].map(m=>unescapeXml(m[1]));
   const districts=[...new Set(names.filter(name=>/^[\p{Script=Han}]{1,12}[市區鎮鄉]$/u.test(name)))];
   if(districts.length===0)throw new Error("unexpected_xml");
   return NextResponse.json({county,districts,source:"NLSC ListTown"},{headers:{"Cache-Control":"public, max-age=3600"}});
 }catch(error){
   console.error("real_price_district_list_error",error instanceof Error?error.message:"unknown");
   return NextResponse.json({error:"district_list_unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
