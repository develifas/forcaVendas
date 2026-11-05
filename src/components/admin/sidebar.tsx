"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  BadgeDollarSign,
  Store,
  BarChart3,
  CreditCard,
  Settings,
  ShieldCheck,
  ArrowUpDown,
  Plug,
  X,
} from "lucide-react";

export const navigationItems = [
  { name: "Painel", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Produtos", href: "/products", icon: Package },
  { name: "Orçamentos", href: "/quotes", icon: FileText },
  { name: "Pedidos", href: "/orders", icon: ShoppingCart },
  { name: "Vendas", href: "/sales", icon: BadgeDollarSign },
  { name: "Parâmetros & Loja", href: "/storefront", icon: Store },
  { name: "Usuários & Acesso", href: "/users", icon: ShieldCheck },
  { name: "Importar / Exportar", href: "/import-export", icon: ArrowUpDown },
  { name: "Integração ERP", href: "/integration", icon: Plug },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Planos & Assinatura", href: "/subscription", icon: CreditCard },
  { name: "Roteamento & Bancos", href: "/settings", icon: Settings, masterOnly: true },
];

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isMaster?: boolean;
}

export function Sidebar({ isOpenMobile, onCloseMobile, isMaster = false }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter((it) => !it.masterOnly || isMaster);

  const sidebarContent = (
    <div className="flex h-full flex-col border-r bg-card text-card-foreground">
      <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow">
            FV
          </div>
          <span className="text-base tracking-tight font-bold">Painel Força de Vendas</span>
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1 hover:bg-muted lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
                  isActive && "bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4 text-xs text-muted-foreground text-center">
        <span>Site Força de Vendas &bull; Pró-Control</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-muted/20 lg:block lg:w-64 lg:shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

