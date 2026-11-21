import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime="edge";
// Minimal, authenticated property picker. Never send confidential address_private or owner details.
export async function GET(){
 const auth=await requireApiRole(["editor","admin","owner"]);
 if(auth.response)return auth.response;
 const db=await createSupabaseServerClient();
 const {data,error}=await db.from("properties")
   .select("id,title,listing_no,city,district,address_public,property_type")
   .is("deleted_at",null).order("updated_at",{ascending:false}).limit(300);
 if(error)return NextResponse.json({error:"properties_unavailable"},{status:503});
 return NextResponse.json({data:data||[]},{headers:{"Cache-Control":"private, no-store"}});
}
