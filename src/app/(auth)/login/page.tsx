"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Briefcase,
  Building2,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [company, setCompany] = useState("pro-control");
  const [username, setUsername] = useState("adilson");
  const [password, setPassword] = useState("5122");
  const [destination, setDestination] = useState<"fv" | "admin">("fv");

  const fillPreset = (
    comp: string,
    user: string,
    pass: string,
    dest: "fv" | "admin" = "fv"
  ) => {
    setCompany(comp);
    setUsername(user);
    setPassword(pass);
    setDestination(dest);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Formulário Principal de Login - Site Força de Vendas */}
        <Card className="border-muted shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Acesso ao Site Força de Vendas (FV)
                </CardTitle>
                <CardDescription className="text-xs">
                  Pró-Control Controles Informatizados • Multi-empresa
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form action={formAction}>
            <CardContent className="space-y-4">
              {state?.error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-xs font-semibold text-destructive">
                  {state.error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold" htmlFor="company">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Empresa (Código FV ou CNPJ)
                </label>
                <Input
                  id="company"
                  name="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ex.: pro-control, computiva, ig_fv ou CNPJ"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Aceita o código (<code className="font-bold">pro-control</code>,{" "}
                  <code className="font-bold">computiva</code>, <code className="font-bold">ig_fv</code>) ou o
                  CNPJ (<code className="font-bold">35951466000157</code>,{" "}
                  <code className="font-bold">03358951000198</code>).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold" htmlFor="username">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Usuário (Vendedor) ou CNPJ do Cliente
                </label>
                <Input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex.: adilson, admin ou CNPJ do cliente"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold" htmlFor="password">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                    Senha
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Cliente: normalmente é o próprio CNPJ/CPF
                  </span>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Escolha para onde ir após autenticar */}
              <div className="space-y-1.5 pt-1">
                <span className="block text-xs font-bold">Módulo de destino após entrar:</span>
                <input type="hidden" name="destination" value={destination} />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestination("fv")}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition ${
                      destination === "fv"
                        ? "border-primary bg-primary/10 font-bold text-primary"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <div>
                      <div className=" leading-tight">Área de Vendas (FV)</div>
                      <div className="text-[10px] font-normal opacity-80">
                        Loja e Lançamento de Pedidos
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestination("admin")}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition ${
                      destination === "admin"
                        ? "border-primary bg-primary/10 font-bold text-primary"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="leading-tight">Área Administrativa</div>
                      <div className="text-[10px] font-normal opacity-80">
                        Painel Força de Vendas
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full font-bold" disabled={isPending}>
                {isPending
                  ? "Autenticando..."
                  : destination === "fv"
                  ? "Entrar na Área de Vendas (FV)"
                  : "Entrar na Área Administrativa do Força de Vendas"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Painel Lateral de Credenciais Homologadas (1 Clique para preencher) */}
        <Card className="border-muted bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary" />
              Acessos Homologados (Clique para Preencher)
            </CardTitle>
            <CardDescription className="text-xs">
              Clique em qualquer perfil abaixo para preencher os dados automaticamente:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {/* 1. PRO-CONTROL Vendedor Adilson */}
            <div
              onClick={() => fillPreset("pro-control", "adilson", "5122", "fv")}
              className="cursor-pointer rounded-xl border bg-background p-3 transition hover:border-primary hover:shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>1. Vendedor PRO-CONTROL (Adilson)</span>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-600">
                  35.951.466/0001-57
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Empresa: <b className="text-foreground">pro-control</b> • Usuário:{" "}
                <b className="text-foreground">adilson</b> • Senha:{" "}
                <b className="text-foreground">5122</b>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Abre a tela de vendas como vendedor permitindo indicar qual cliente está comprando.
              </p>
            </div>

            {/* 2. COMPUTIVA Vendedor / FV */}
            <div
              onClick={() => fillPreset("computiva", "adilson", "5122", "fv")}
              className="cursor-pointer rounded-xl border bg-background p-3 transition hover:border-primary hover:shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>2. Empresa COMPUTIVA (Força de Vendas)</span>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] text-sky-600">
                  03.358.951/0001-98
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Empresa: <b className="text-foreground">computiva</b> • Usuário:{" "}
                <b className="text-foreground">adilson</b> • Senha:{" "}
                <b className="text-foreground">5122</b>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Banco de dados exclusivo da Computiva (`03358951000198_BDpdon`).
              </p>
            </div>

            {/* 3. Cliente Direto (Login = CNPJ / Senha = CNPJ) */}
            <div
              onClick={() =>
                fillPreset("pro-control", "03358951000198", "03358951000198", "fv")
              }
              className="cursor-pointer rounded-xl border bg-background p-3 transition hover:border-primary hover:shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>3. Cliente Direto (Login e Senha = CNPJ)</span>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-600">
                  Cliente B2B -10%
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Loja: <b className="text-foreground">pro-control</b> • Login:{" "}
                <b className="text-foreground">03358951000198</b> • Senha:{" "}
                <b className="text-foreground">03358951000198</b>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                O cliente cadastrado acessa direto com seu CNPJ como usuário e senha.
              </p>
            </div>

            {/* 4. IG Decoração */}
            <div
              onClick={() => fillPreset("ig_fv", "admin", "ig@123", "fv")}
              className="cursor-pointer rounded-xl border bg-background p-3 transition hover:border-primary hover:shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>4. IG Decoração (Referência FV)</span>
                <span className="rounded bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] text-purple-600">
                  11.222.333/0001-81
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Empresa: <b className="text-foreground">ig_fv</b> • Usuário:{" "}
                <b className="text-foreground">admin</b> • Senha:{" "}
                <b className="text-foreground">ig@123</b>
              </p>
            </div>

            {/* 5. ADMIN MASTER GLOBAL */}
            <div
              onClick={() => fillPreset("master", "master", "master", "admin")}
              className="cursor-pointer rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-3 transition hover:border-amber-500 hover:shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>5. Admin Master (Acesso a Todas as Empresas)</span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700">
                  Acesso Global
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Empresa: <b className="text-foreground">master</b> • Usuário:{" "}
                <b className="text-foreground">master</b> • Senha:{" "}
                <b className="text-foreground">master</b>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Permite alternar entre todas as empresas no topo e provisionar novos CNPJs.
              </p>
            </div>

            {/* Links diretos para a tela de lançamento de vendas de cada CNPJ */}
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="mb-2 font-bold text-foreground">
                Acesso Direto à Tela de Lançamento de Vendas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href="/loja/35951466000157"
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-primary hover:text-primary"
                >
                  PRO-CONTROL (35951466000157) <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href="/loja/03358951000198"
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-primary hover:text-primary"
                >
                  COMPUTIVA (03358951000198) <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href="/loja/11222333000181"
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-primary hover:text-primary"
                >
                  IG (11222333000181) <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
