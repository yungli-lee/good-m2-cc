import { getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { handlePersonPatch } from "@/lib/people/patch";
import type { PersonPatchDependencies } from "@/lib/people/patch";
import type { PersonRoleName } from "@/lib/people/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const dependencies: PersonPatchDependencies = {
    getCurrentProfile,
    async getPerson(personId) {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("id", personId)
        .maybeSingle();
      return { data, error };
    },
    async getRoles(personId) {
      const { data, error } = await supabase
        .from("person_roles")
        .select("role")
        .eq("person_id", personId);
      return {
        data: (data || []) as Array<{ role: PersonRoleName }>,
        error
      };
    },
    async updatePerson(personId, payload) {
      const { data, error } = await supabase
        .from("people")
        .update(payload)
        .eq("id", personId)
        .select()
        .single();
      return { data, error };
    },
    async removeRoles(personId, roles) {
      const { error } = await supabase
        .from("person_roles")
        .delete()
        .eq("person_id", personId)
        .in("role", roles);
      return { error };
    },
    async addRoles(personId, roles, userId) {
      const { data, error } = await supabase
        .from("person_roles")
        .insert(roles.map((role) => ({
          person_id: personId,
          role,
          created_by: userId
        })))
        .select();
      return { data, error };
    },
    recordAudit: recordAuditLog
  };

  return handlePersonPatch(request, id, dependencies);
}
