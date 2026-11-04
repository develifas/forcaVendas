import { createClient } from "@/lib/supabase/server";

export interface AuditLogPayload {
  tenantId?: string;
  actorId?: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "SETTINGS_UPDATE" | "USER_INVITE";
  entity: string;
  entityId?: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records an immutable audit log entry.
 * RLS ensures only permitted tenant members can insert records for their tenant.
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // If actorId wasn't passed, obtain it from current authenticated user
    let actorId = payload.actorId;
    if (!actorId) {
      const { data: { user } } = await supabase.auth.getUser();
      actorId = user?.id;
    }

    const { error } = await supabase.from("audit_logs").insert({
      tenant_id: payload.tenantId,
      actor_id: actorId,
      action: payload.action,
      entity: payload.entity,
      entity_id: payload.entityId,
      old_data: payload.oldData || null,
      new_data: payload.newData || null,
      ip_address: payload.ipAddress,
      user_agent: payload.userAgent,
    });

    if (error) {
      console.error("[AuditLog] Failed to record audit log:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error in audit logger";
    console.error("[AuditLog] Exception:", message);
    return { success: false, error: message };
  }
}

