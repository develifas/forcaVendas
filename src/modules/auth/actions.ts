"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { onlyDigits } from "@/lib/cnpj";
import { verifyPassword } from "@/lib/security";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { getTenantDatabase, readPlatformData } from "@/lib/tenant-store";
import { setSession } from "@/modules/store/session";
import { ACTIVE_TENANT_COOKIE, AUTH_USER_COOKIE } from "@/modules/tenants/resolver";
import type { AuthUserSession } from "@/modules/tenants/types";

export interface AuthState {
  error?: string;
  success?: string;
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const companyInput = String(formData.get("company") ?? "").trim();
  const usernameInput = String(
    formData.get("username") ?? formData.get("email") ?? ""
  ).trim();
  const password = String(formData.get("password") ?? "").trim();
  const destination = String(formData.get("destination") ?? "fv").trim();

  if (!companyInput || !usernameInput || !password) {
    return {
      error: "Informe a Empresa (código ou CNPJ), o Usuário e a Senha.",
    };
  }

  // 1) ACESSO ADMIN MASTER GLOBAL (Acesso irrestrito a todas as empresas/lojas)
  const isMasterLogin =
    companyInput.toLowerCase() === "master" ||
    companyInput.toLowerCase() === "plataforma" ||
    usernameInput.toLowerCase() === "master" ||
    usernameInput.toLowerCase() === "adminmaster" ||
    usernameInput.toLowerCase() === "superadmin" ||
    (usernameInput.toLowerCase() === "admin" && (password === "master" || password === "master123"));

  if (isMasterLogin) {
    const isMasterPassOk =
      password === "master" ||
      password === "master123" ||
      password === "admin" ||
      password === "5122" ||
      password === "ig@123";

    if (!isMasterPassOk) {
      return { error: "Senha inválida para o login de Administrador Master." };
    }

    const platform = readPlatformData();
    const defaultRoute =
      (companyInput.toLowerCase() !== "master" &&
        companyInput.toLowerCase() !== "plataforma" &&
        (await resolveTenantRoute(companyInput))) ||
      platform.routes[0];

    const cookieStore = await cookies();
    if (defaultRoute) {
      cookieStore.set(ACTIVE_TENANT_COOKIE, defaultRoute.tenantId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    const masterSession: AuthUserSession = {
      userId: "usr-master-global",
      username: usernameInput || "master",
      name: "Administrador Master Global",
      email: "master@plataforma.com.br",
      role: "master",
      isMaster: true,
    };

    cookieStore.set(AUTH_USER_COOKIE, JSON.stringify(masterSession), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    if (destination === "s2000" || destination === "admin") {
      redirect("/");
    }
    if (defaultRoute) {
      await setSession(defaultRoute, {
        cid: "",
        name: "Não selecionado!",
        doc: "",
        discountPercent: 0,
        sellerId: "usr-master-global",
        sellerName: "Admin Master",
        sellerUsername: "master",
      });
      redirect(`/loja/${defaultRoute.cnpj}`);
    }
    redirect("/");
  }

  // 2) ACESSO LIMITADO À EMPRESA ESPECÍFICA (Acesso exclusivo, isolando das outras lojas)
  const route = await resolveTenantRoute(companyInput);
  if (!route) {
    return {
      error: `Empresa "${companyInput}" não encontrada. Use ex.: pro-control (35951466000157), computiva (03358951000198) ou ig_fv (11222333000181).`,
    };
  }

  const db = getTenantDatabase(route.cnpj);
  if (!db) {
    return { error: "Banco de dados da empresa não localizado." };
  }

  // 2.1) Vendedor / Usuário da empresa (ex.: adilson / 5122 ou admin da loja)
  const staff = (db.staffUsers ?? []).find(
    (u) =>
      u.status === "active" &&
      ((u.username && u.username.toLowerCase() === usernameInput.toLowerCase()) ||
        u.email.toLowerCase() === usernameInput.toLowerCase())
  );

  if (staff) {
    const passOk = staff.passwordHash
      ? verifyPassword(password, staff.passwordHash)
      : password === "5122" || password === "demo123";

    if (!passOk) {
      return { error: "Senha inválida para o vendedor/usuário informado." };
    }

    // Sincroniza a empresa ativa limitada estritamente a este CNPJ
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TENANT_COOKIE, route.tenantId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Salva sessão do usuário vinculada e limitada à empresa logada (isMaster: false)
    const userSession: AuthUserSession = {
      userId: staff.id,
      username: staff.username || staff.email,
      name: staff.name,
      email: staff.email,
      role: staff.role || "seller",
      tenantId: route.tenantId,
      cnpj: route.cnpj,
      isMaster: false,
    };

    cookieStore.set(AUTH_USER_COOKIE, JSON.stringify(userSession), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Inicia também a sessão de Vendedor na Tela de Lançamento de Vendas (/loja/[cnpj])
    const selectedCustomerId = String(formData.get("customerId") ?? "").trim();
    const chosenCustomer = selectedCustomerId
      ? db.customers.find((c) => c.id === selectedCustomerId && c.isActive)
      : undefined;

    await setSession(route, {
      cid: chosenCustomer?.id ?? "",
      name: chosenCustomer ? chosenCustomer.name : "Não selecionado!",
      doc: chosenCustomer?.document ?? "",
      discountPercent: chosenCustomer?.discountPercent ?? 0,
      sellerId: staff.id,
      sellerName: staff.name,
      sellerUsername: staff.username || staff.email,
    });

    if (destination === "s2000" || destination === "admin") {
      redirect("/");
    }
    redirect(`/loja/${route.cnpj}`);
  }

  // 2.2) Cliente cadastrado da loja
  const docDigits = onlyDigits(usernameInput);
  const customer = db.customers.find(
    (c) =>
      c.isActive &&
      ((docDigits.length >= 11 && c.document === docDigits) ||
        c.document.toLowerCase() === usernameInput.toLowerCase() ||
        (c.login && c.login.toLowerCase() === usernameInput.toLowerCase()))
  );

  if (customer) {
    const passDigits = onlyDigits(password);
    const okHash = verifyPassword(password, customer.passwordHash);
    const okHint =
      customer.passwordPlainHint !== undefined &&
      customer.passwordPlainHint.replace(/\s*\((CPF|CNPJ)\)\s*$/i, "") === password;
    const okCnpjDefault = passDigits.length >= 11 && passDigits === customer.document;

    if (!okHash && !okHint && !okCnpjDefault) {
      return {
        error: "Senha do cliente inválida (normalmente é o próprio CPF/CNPJ somente números).",
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TENANT_COOKIE, route.tenantId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    const userSession: AuthUserSession = {
      userId: customer.id,
      username: customer.login || customer.document,
      name: customer.name,
      email: customer.email || `${customer.document}@cliente.loja`,
      role: "customer",
      tenantId: route.tenantId,
      cnpj: route.cnpj,
      isMaster: false,
    };

    cookieStore.set(AUTH_USER_COOKIE, JSON.stringify(userSession), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    await setSession(route, {
      cid: customer.id,
      name: customer.name,
      doc: customer.document,
      discountPercent: customer.discountPercent ?? 0,
    });

    redirect(`/loja/${route.cnpj}`);
  }

  return {
    error: `Usuário ou CNPJ "${usernameInput}" não encontrado na empresa ${route.name}.`,
  };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_TENANT_COOKIE);
  cookieStore.delete(AUTH_USER_COOKIE);
  redirect("/login");
}

export async function forgotPasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Informe o seu e-mail cadastrado." };
  }

  return {
    success: "Instruções de recuperação simuladas com sucesso para " + email,
  };
}

export async function resetPasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    return { error: "A nova senha deve ter no mínimo 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas informadas não coincidem." };
  }

  redirect("/login?message=Senha atualizada com sucesso");
}
