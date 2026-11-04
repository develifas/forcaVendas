"use client";

import React from "react";
import { hexToHsl } from "@/modules/store-settings/utils";
import { StoreSettings } from "@/modules/store-settings/types";

interface TenantThemeProviderProps {
  settings: StoreSettings;
  children: React.ReactNode;
}

export function TenantThemeProvider({ settings, children }: TenantThemeProviderProps) {
  const cssVars = `
    :root {
      --primary: ${hexToHsl(settings.primaryColor)};
      --primary-foreground: ${hexToHsl(settings.primaryForeground)};
      --accent: ${hexToHsl(settings.accentColor)};
      --accent-foreground: ${hexToHsl(settings.accentForeground)};
      --background: ${hexToHsl(settings.backgroundColor)};
      --foreground: ${hexToHsl(settings.foregroundColor)};
      --card: ${hexToHsl(settings.cardColor)};
      --card-foreground: ${hexToHsl(settings.cardForeground)};
      --muted-foreground: ${hexToHsl(settings.mutedForeground)};
      --border: ${hexToHsl(settings.borderColor)};
      --input: ${hexToHsl(settings.inputColor)};
      --ring: ${hexToHsl(settings.ringColor)};
      --radius: ${settings.radius};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {children}
    </>
  );
}
