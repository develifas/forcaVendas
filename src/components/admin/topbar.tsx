"use client";

import React from "react";
import { TenantSwitcher } from "./tenant-switcher";
import { TenantUserMembership } from "@/modules/tenants/types";
import { logoutAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User } from "lucide-react";

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

      {/* Tenant Switcher */}
      <div className="flex flex-1 items-center gap-3">
        <TenantSwitcher
          currentTenantId={currentTenantId}
          memberships={memberships}
          isMaster={isMaster}
        />
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 border-r pr-3 text-xs text-muted-foreground sm:flex">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[220px] truncate">{userEmail || "usuário"}</span>
          {isMaster && (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Master
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
