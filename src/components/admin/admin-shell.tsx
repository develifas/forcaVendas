"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TenantUserMembership } from "@/modules/tenants/types";

interface AdminShellProps {
  currentTenantId?: string;
  memberships: TenantUserMembership[];
  userEmail?: string;
  isMaster?: boolean;
  children: React.ReactNode;
}

export function AdminShell({
  currentTenantId,
  memberships,
  userEmail,
  isMaster = false,
  children,
}: AdminShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isMaster={isMaster}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          currentTenantId={currentTenantId}
          memberships={memberships}
          userEmail={userEmail}
          isMaster={isMaster}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

