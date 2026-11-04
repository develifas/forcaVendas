"use server";

import { cookies } from "next/headers";
import { ACTIVE_TENANT_COOKIE, AUTH_USER_COOKIE } from "./resolver";
import { revalidatePath } from "next/cache";
import type { AuthUserSession } from "./types";

export async function switchActiveTenant(tenantId: string) {
  const cookieStore = await cookies();
  const rawAuth = cookieStore.get(AUTH_USER_COOKIE)?.value;

  if (rawAuth) {
    try {
      const authUser: AuthUserSession = JSON.parse(rawAuth);
      // Se não for Admin Master, impede alternar para empresas que não sejam a dele
      if (!authUser.isMaster && authUser.tenantId && authUser.tenantId !== tenantId) {
        return;
      }
    } catch {
      // ignore
    }
  }

  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  revalidatePath("/", "layout");
}

