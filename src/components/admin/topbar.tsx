"use client";

import React from "react";
import Link from "next/link";
import { TenantSwitcher } from "./tenant-switcher";
import { TenantUserMembership } from "@/modules/tenants/types";
import { logoutAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User, ExternalLink, Database } from "lucide-react";

interface TopbarProps {
  currentTenantId?: string;
  memberships: TenantUserMembership[];
  userEmail?: string;
  isMaster?: boolean;
  onOpenMobileMenu: () => void;
}

export function Topbar({
  currentTenantId,
  memberships,
  userEmail,
  isMaster = false,
  onOpenMobileMenu,
}: TopbarProps) {
  const currentMembership =
    memberships.find((m) => m.tenantId === currentTenantId) || memberships[0];
  const activeCnpj = currentMembership?.tenant?.cnpj;
  const activeDb = currentMembership?.tenant?.dbName;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menu lateral"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Tenant Switcher + DB Badge */}
      <div className="flex flex-1 items-center gap-3">
        <TenantSwitcher
          currentTenantId={currentTenantId}
          memberships={memberships}
          isMaster={isMaster}
        />

        {activeDb && (
          <span className="hidden items-center gap-1.5 rounded-md border bg-muted/60 px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground md:inline-flex">
            <Database className="h-3 w-3 text-primary" />
            {activeDb}
          </span>
        )}
      </div>

      {/* Direct Link to Storefront + User Actions */}
      <div className="flex items-center gap-2.5">
        {activeCnpj && (
          <Link
            href={`/loja/${activeCnpj}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <span>Abrir Loja Virtual</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}

        <div className="hidden items-center gap-2 border-r pr-3 text-xs text-muted-foreground sm:flex">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[200px] truncate">{userEmail || "usuário"}</span>
          {isMaster ? (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Admin Master
            </span>
          ) : (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Empresa Exclusiva
            </span>
          )}
        </div>

        <form action={logoutAction}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
