"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, X, ExternalLink, Plus } from "lucide-react";
import type {
  DbPaymentMethod,
  DbStoreBanner,
  DbStoreEmailAccount,
  DbStoreParameters,
} from "@/lib/tenant-store";
import {
  createPaymentMethodAction,
  saveStoreParametersAction,
  togglePaymentMethodAction,
} from "@/modules/admin/actions";

interface Props {
  cnpj: string;
  companyCode: string;
  tenantName: string;
  dbName: string;
  primaryColor: string;
  bannerText: string;
  initialParams: DbStoreParameters;
  paymentMethods: DbPaymentMethod[];
}

const COLOR_OPTIONS = [
  { label: "Padrão (Cinza Claro)", value: "#EFEFEF" },
  { label: "Azul Pro-Control", value: "#1E40AF" },
  { label: "Azul Celeste", value: "#44C5ED" },
  { label: "Verde FV", value: "#8CC63F" },
  { label: "Laranja FV", value: "#E87E33" },
  { label: "Vermelho", value: "#C00000" },
  { label: "Preto", value: "#111827" },
  { label: "Branco", value: "#FFFFFF" },
];

export function StoreParametersManager({
  cnpj,
  companyCode,
  tenantName,
  dbName,
  primaryColor,
  bannerText,
  initialParams,
  paymentMethods,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    | "parametros"
    | "dados_gerais"
    | "botoes_acesso"
    | "conta_email"
    | "banners"
    | "layout"
  >("parametros");

  const [params, setParams] = useState<DbStoreParameters>(initialParams);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string>(
    initialParams.logoUrl || ""
  );
  const [logoFileName, setLogoFileName] = useState<string>("");

  // Estado da Aba 4 (Conta de Email)
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emType, setEmType] = useState("Principal");
  const [emEmail, setEmEmail] = useState("");
  const [emSmtp, setEmSmtp] = useState("smtp.gmail.com");
  const [emPort, setEmPort] = useState("587");
  const [emDefault, setEmDefault] = useState(true);
  const [emStatus, setEmStatus] = useState<"ativo" | "inativo">("ativo");
  const [viewingEmail, setViewingEmail] = useState<DbStoreEmailAccount | null>(
    null
  );

  // Estado da Aba 5 (Banner's)
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bnName, setBnName] = useState("");
  const [bnImageName, setBnImageName] = useState("FV-01.png");
  const [bnImageUrl, setBnImageUrl] = useState("");
  const [bnLinkUrl, setBnLinkUrl] = useState("");
  const [bnOrder, setBnOrder] = useState(1);
  const [bnStatus, setBnStatus] = useState<"ativo" | "inativo">("ativo");
  const [viewingBanner, setViewingBanner] = useState<DbStoreBanner | null>(
    null
  );

  // Estado da Aba 6 (Layout)
  const [layoutName, setLayoutName] = useState(tenantName);
  const [layoutColor, setLayoutColor] = useState(primaryColor || "#44C5ED");
  const [layoutBannerText, setLayoutBannerText] = useState(bannerText);

  const [successModalMsg, setSuccessModalMsg] = useState<string | null>(null);

  const updateParam = <K extends keyof DbStoreParameters>(
    key: K,
    val: DbStoreParameters[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  // Lê arquivo de imagem do computador na Aba 2 (Dados Gerais)
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoPreviewDataUrl(reader.result);
        updateParam("logoUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Lê arquivo de imagem do computador na Aba 5 (Banner's) e otimiza via Canvas
  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBnImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src !== "string") return;
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setBnImageUrl(compressed);
        } else {
          setBnImageUrl(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Gera e baixa arquivo HTML na Aba 3 (Botões de Acesso)
  const handleDownloadHtmlFile = (target: "loja" | "login") => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const destUrl =
      target === "loja"
        ? `${origin}/loja/${cnpj}`
        : `${origin}/login?empresa=${companyCode}`;
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${params.accessBtnText} - ${tenantName}</title>
</head>
<body>
  <input name='botao' type='button' value='${params.accessBtnText}' style='background:${params.accessBtnBgColor}; width:${params.accessBtnWidth}px; height:${params.accessBtnHeight}px; color:${params.accessBtnTextColor}; cursor:pointer;' onclick="window.open('${destUrl}','_blank');" />
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      target === "loja"
        ? `loja-virtual-${companyCode}.html`
        : `login-vendedores-${companyCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Funções da Aba 4 (Conta de Email)
  const openNewEmailForm = () => {
    setEditingEmailId(null);
    setEmType("Principal");
    setEmEmail("");
    setEmSmtp("smtp.gmail.com");
    setEmPort("587");
    setEmDefault(params.emailAccounts.length === 0);
    setEmStatus("ativo");
    setShowEmailForm(true);
  };

  const openEditEmailForm = (acc: DbStoreEmailAccount) => {
    setEditingEmailId(acc.id);
    setEmType(acc.type);
    setEmEmail(acc.email);
    setEmSmtp(acc.smtpHost || "smtp.gmail.com");
    setEmPort(acc.smtpPort || "587");
    setEmDefault(acc.isDefault);
    setEmStatus(acc.status);
    setShowEmailForm(true);
  };

  const handleSaveEmailAccount = () => {
    if (!emEmail.trim()) return;
    const newItem: DbStoreEmailAccount = {
      id: editingEmailId || `em-${Date.now()}`,
      type: emType.trim() || "Principal",
      isDefault: emDefault,
      email: emEmail.trim(),
      smtpHost: emSmtp.trim(),
      smtpPort: emPort.trim(),
      status: emStatus,
    };
    const nextList = editingEmailId
      ? params.emailAccounts.map((x) =>
          x.id === editingEmailId
            ? newItem
            : emDefault
            ? { ...x, isDefault: false }
            : x
        )
      : [
          ...params.emailAccounts.map((x) =>
            emDefault ? { ...x, isDefault: false } : x
          ),
          newItem,
        ];
    updateParam("emailAccounts", nextList);
    setShowEmailForm(false);
    setEditingEmailId(null);
  };

  const handleDeleteEmailAccount = (id: string) => {
    updateParam(
      "emailAccounts",
      params.emailAccounts.filter((x) => x.id !== id)
    );
    if (viewingEmail?.id === id) setViewingEmail(null);
  };

  const handleToggleDefaultEmail = (id: string) => {
    updateParam(
      "emailAccounts",
      params.emailAccounts.map((x) => ({
        ...x,
        isDefault: x.id === id,
      }))
    );
  };

  // Funções da Aba 5 (Banner's)
  const openNewBannerForm = () => {
    setEditingBannerId(null);
    setBnName("pedidos online");
    setBnImageName(`FV-0${params.banners.length + 1}.png`);
    setBnImageUrl("");
    setBnLinkUrl("");
    setBnOrder(params.banners.length + 1);
    setBnStatus("ativo");
    setShowBannerForm(true);
  };

  const openEditBannerForm = (b: DbStoreBanner) => {
    setEditingBannerId(b.id);
    setBnName(b.name);
    setBnImageName(b.imageName);
    setBnImageUrl(b.imageUrl || "");
    setBnLinkUrl(b.linkUrl || "");
    setBnOrder(b.order);
    setBnStatus(b.status || (b.isActive === false ? "inativo" : "ativo"));
    setShowBannerForm(true);
  };

  const handleSaveBanner = () => {
    if (!bnName.trim()) return;
    const item: DbStoreBanner = {
      id: editingBannerId || `bn-${Date.now()}`,
      name: bnName.trim(),
      imageName: bnImageName.trim() || "FV-01.png",
      imageUrl: bnImageUrl || "/produtos/p1.jpg",
      order: bnOrder,
      status: bnStatus,
      isActive: bnStatus === "ativo",
      linkUrl: bnLinkUrl.trim() || undefined,
    };
    const nextList = editingBannerId
      ? params.banners.map((x) => (x.id === editingBannerId ? item : x))
      : [...params.banners, item];
    updateParam("banners", nextList);
    setShowBannerForm(false);
    setEditingBannerId(null);
  };

  const handleDeleteBanner = (id: string) => {
    updateParam(
      "banners",
      params.banners.filter((x) => x.id !== id)
    );
    if (viewingBanner?.id === id) setViewingBanner(null);
  };

  const tabClass = (active: boolean) =>
    `px-3.5 py-1.5 text-xs font-bold rounded-t border border-b-0 transition ${
      active
        ? "bg-[#E87E33] text-white border-[#D66B20]"
        : "bg-[#95A5A6] text-white border-[#839496] hover:opacity-90"
    }`;

  const siteUrlForSnippet = params.site
    ? params.site.startsWith("http")
      ? params.site
      : `http://www.${params.site.replace(/^www\./, "")}/`
    : `http://localhost:3000/loja/${cnpj}`;

  const embedCodeSnippet = `<input name='botao' type='button' value='${
    params.accessBtnText
  }' style='background:${
    params.accessBtnBgColor === "#EFEFEF" ? "" : params.accessBtnBgColor
  }; width:${params.accessBtnWidth}px; height:${
    params.accessBtnHeight
  }px; color:${params.accessBtnTextColor};' onclick=window.open('${siteUrlForSnippet}','_blank');>`;

  return (
    <div className="space-y-6">
      {/* Modal de Sucesso padrão FV */}
      {successModalMsg && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-[330px] overflow-hidden rounded-xl border-2 border-[#B3E0F2] bg-white text-slate-900 shadow-2xl">
            <div className="bg-[#BCE2F5] px-4 py-2.5">
              <h2 className="text-sm font-extrabold text-[#0B258A]">
                Sucesso!
              </h2>
            </div>
            <div className="px-4 pb-4 pt-3">
              <p className="min-h-[55px] text-xs font-medium text-slate-900">
                {successModalMsg}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSuccessModalMsg(null)}
                  className="inline-flex h-7 items-center justify-center rounded border-2 border-slate-900 bg-white px-5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de caminho superior: Início | Administrar | Parâmetros (Fiel aos Prints 1 a 5) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            Início
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="/orders"
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            Administrar
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="font-extrabold text-foreground">Parâmetros</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {tenantName} • {dbName}
          </span>
          <Link
            href={`/loja/${cnpj}`}
            target="_blank"
            className="inline-flex h-8 items-center gap-1.5 rounded border bg-background px-3 text-xs font-bold shadow-2xs hover:bg-accent"
          >
            Abrir Loja (/loja/{cnpj}) <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Formulário Geral dos Parâmetros da Loja */}
      <form
        action={async (fd) => {
          await saveStoreParametersAction(fd);
          setSuccessModalMsg(
            `Os parâmetros da loja ${tenantName} foram salvos com sucesso!`
          );
        }}
        className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
      >
        <input type="hidden" name="cnpj" value={cnpj} />
        <input
          type="hidden"
          name="parametersJson"
          value={JSON.stringify(params)}
        />
        <input type="hidden" name="routeName" value={layoutName} />
        <input type="hidden" name="primaryColor" value={layoutColor} />
        <input type="hidden" name="bannerText" value={layoutBannerText} />
        {logoPreviewDataUrl.startsWith("data:image/") && (
          <input
            type="hidden"
            name="uploadedImagesData"
            value={logoPreviewDataUrl}
          />
        )}

        {/* Abas Superiores: Parâmetros | Dados Gerais | Botões de Acesso | Conta de Email | Banner's | Layout */}
        <div className="flex flex-wrap gap-1 border-b border-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab("parametros")}
            className={tabClass(activeTab === "parametros")}
          >
            Parâmetros
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dados_gerais")}
            className={tabClass(activeTab === "dados_gerais")}
          >
            Dados Gerais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("botoes_acesso")}
            className={tabClass(activeTab === "botoes_acesso")}
          >
            Botões de Acesso
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conta_email")}
            className={tabClass(activeTab === "conta_email")}
          >
            Conta de Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banners")}
            className={tabClass(activeTab === "banners")}
          >
            Banner&apos;s
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("layout")}
            className={tabClass(activeTab === "layout")}
          >
            Layout
          </button>
        </div>

        {/* ===================================================================
            ABA 1: PARÂMETROS (Fiel ao Print 1)
           =================================================================== */}
        {activeTab === "parametros" && (
          <div>
            <div className="space-y-3 rounded-b border border-t-0 border-slate-200 bg-background p-5 text-xs">
              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={params.sendOrderTxtToCompany}
                  onChange={(e) =>
                    updateParam("sendOrderTxtToCompany", e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span>Enviar pedido em arquivo de texto para a empresa</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={params.sendOrderCopyToCustomer}
                  onChange={(e) =>
                    updateParam("sendOrderCopyToCustomer", e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span>Enviar cópia do pedido para o cliente</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={params.sendOrderCopyToCompany}
                  onChange={(e) =>
                    updateParam("sendOrderCopyToCompany", e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span>Enviar cópia do pedido para a empresa</span>
              </label>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={params.enableVirtualStore}
                    onChange={(e) =>
                      updateParam("enableVirtualStore", e.target.checked)
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>Habilitar loja Virtual</span>
                </label>

                <div className="flex items-center gap-3 pl-8 text-muted-foreground">
                  <span>Visualizar Preço de Produtos</span>
                  <select
                    value={params.showProductPrices}
                    onChange={(e) =>
                      updateParam(
                        "showProductPrices",
                        e.target.value as "sim" | "nao"
                      )
                    }
                    className="h-8 w-24 rounded border border-slate-300 bg-background px-2 text-xs font-semibold text-foreground"
                  >
                    <option value="sim">sim</option>
                    <option value="nao">não</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={params.showPromoOnHome}
                    onChange={(e) =>
                      updateParam("showPromoOnHome", e.target.checked)
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>
                    Exibir Produtos em Promoção na página Inicial da tela de
                    vendas?
                  </span>
                </label>

                <div className="flex items-center gap-3 pl-8 text-muted-foreground">
                  <span>Quantidade de ítens exibidos na tela</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={params.promoItemsCount}
                    onChange={(e) =>
                      updateParam(
                        "promoItemsCount",
                        Number(e.target.value) || 50
                      )
                    }
                    className="h-8 w-20 rounded border border-slate-300 bg-background px-2.5 text-xs font-semibold text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={params.showBestSellersOnHome}
                    onChange={(e) =>
                      updateParam("showBestSellersOnHome", e.target.checked)
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>
                    Exibir Produtos mais Vendidos na página Inicial da tela de
                    vendas?
                  </span>
                </label>

                <div className="flex items-center gap-3 pl-8 text-muted-foreground">
                  <span>Quantidade de ítens exibidos na tela</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={params.bestSellersItemsCount}
                    onChange={(e) =>
                      updateParam(
                        "bestSellersItemsCount",
                        Number(e.target.value) || 50
                      )
                    }
                    className="h-8 w-20 rounded border border-slate-300 bg-background px-2.5 text-xs font-semibold text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={params.showMostViewedOnHome}
                    onChange={(e) =>
                      updateParam("showMostViewedOnHome", e.target.checked)
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>
                    Exibir Produtos mais Visualizados na página Inicial da tela
                    de vendas?
                  </span>
                </label>

                <div className="flex items-center gap-3 pl-8 text-muted-foreground">
                  <span>Quantidade de ítens exibidos na tela</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={params.mostViewedItemsCount}
                    onChange={(e) =>
                      updateParam(
                        "mostViewedItemsCount",
                        Number(e.target.value) || 50
                      )
                    }
                    className="h-8 w-20 rounded border border-slate-300 bg-background px-2.5 text-xs font-semibold text-foreground"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={params.useSitePriceForS2000Import}
                  onChange={(e) =>
                    updateParam("useSitePriceForS2000Import", e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span>Utilizar Preço do Site para Importação S2000Plus</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={params.showPhotoOnOrderCopy}
                  onChange={(e) =>
                    updateParam("showPhotoOnOrderCopy", e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span>Visualizar foto na cópia do pedido/email</span>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium">
                * Aqui você pode alterar os parâmetros do sistema
              </span>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-6 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 2: DADOS GERAIS (Fiel ao Print 2)
           =================================================================== */}
        {activeTab === "dados_gerais" && (
          <div>
            <div className="grid gap-6 rounded-b border border-t-0 border-slate-200 bg-background p-5 text-xs lg:grid-cols-[1.5fr_1fr]">
              {/* Coluna Esquerda: Informações de contato + Redes Sociais */}
              <div className="space-y-6">
                <div>
                  <h2 className="border-b border-slate-400 pb-1.5 text-xs font-extrabold">
                    Informações de contato
                  </h2>
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">Site:</label>
                      <input
                        type="text"
                        value={params.site}
                        onChange={(e) => updateParam("site", e.target.value)}
                        placeholder="pro-controll.com.br"
                        className="h-9 w-full max-w-sm rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">Email:</label>
                      <input
                        type="email"
                        value={params.email}
                        onChange={(e) => updateParam("email", e.target.value)}
                        placeholder="igdecoracoes@hotmail.com"
                        className="h-9 w-full max-w-sm rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">Tel.:</label>
                      <div className="flex max-w-sm items-center gap-2">
                        <input
                          type="text"
                          maxLength={3}
                          value={params.phone1Ddd}
                          onChange={(e) =>
                            updateParam("phone1Ddd", e.target.value)
                          }
                          placeholder="27"
                          className="h-9 w-16 rounded border border-slate-300 bg-background px-2.5 text-center text-sm"
                        />
                        <input
                          type="text"
                          value={params.phone1Number}
                          onChange={(e) =>
                            updateParam("phone1Number", e.target.value)
                          }
                          placeholder="998103723"
                          className="h-9 flex-1 rounded border border-slate-300 bg-background px-3 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">Tel2.:</label>
                      <div className="flex max-w-sm items-center gap-2">
                        <input
                          type="text"
                          maxLength={3}
                          value={params.phone2Ddd}
                          onChange={(e) =>
                            updateParam("phone2Ddd", e.target.value)
                          }
                          placeholder="27"
                          className="h-9 w-16 rounded border border-slate-300 bg-background px-2.5 text-center text-sm"
                        />
                        <input
                          type="text"
                          value={params.phone2Number}
                          onChange={(e) =>
                            updateParam("phone2Number", e.target.value)
                          }
                          placeholder="998103723"
                          className="h-9 flex-1 rounded border border-slate-300 bg-background px-3 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="border-b border-slate-400 pb-1.5 text-xs font-extrabold">
                    Redes Sociais
                  </h2>
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">
                        Facebook:
                      </label>
                      <input
                        type="text"
                        value={params.facebook}
                        onChange={(e) =>
                          updateParam("facebook", e.target.value)
                        }
                        className="h-9 w-full max-w-sm rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">
                        Twitter:
                      </label>
                      <input
                        type="text"
                        value={params.twitter}
                        onChange={(e) => updateParam("twitter", e.target.value)}
                        className="h-9 w-full max-w-sm rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-right font-semibold">
                        Instagram:
                      </label>
                      <input
                        type="text"
                        value={params.instagram}
                        onChange={(e) =>
                          updateParam("instagram", e.target.value)
                        }
                        className="h-9 w-full max-w-sm rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Imagem atual cadastrada + Upload do Computador */}
              <div className="flex flex-col items-center rounded-lg bg-muted/40 p-5 text-center">
                <h3 className="text-xs font-bold">Imagem atual cadastrada:</h3>

                <div className="mt-3 flex h-44 w-56 items-center justify-center overflow-hidden border border-slate-300 bg-white p-3 shadow-xs">
                  {logoPreviewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreviewDataUrl}
                      alt={tenantName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : cnpj === "11222333000181" ? (
                    <div className="flex h-36 w-36 flex-col items-center justify-center bg-black text-white">
                      <span className="font-serif text-6xl font-bold leading-none">
                        ig
                      </span>
                      <span className="mt-1 font-serif text-sm italic">
                        decoração
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-28 w-48 items-center justify-between overflow-hidden rounded border border-blue-900 bg-blue-800 text-white">
                      <div className="flex h-full w-14 items-center justify-center bg-slate-100 font-black">
                        <span className="text-2xl">
                          <span className="text-blue-800">P</span>
                          <span className="text-red-600">C</span>
                        </span>
                      </div>
                      <div className="flex-1 px-2 text-left">
                        <div className="text-sm font-extrabold leading-tight">
                          {tenantName}
                        </div>
                        <div className="text-[9px] text-blue-100">
                          Controles Informatizados
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <span className="rounded border border-slate-400 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-slate-200">
                      Escolher arquivo
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {logoFileName || "Nenhum arquivo escolhido"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <p className="mt-3 max-w-[220px] text-xs text-muted-foreground">
                  Selecione uma imagem em seu computador e clique em salvar.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium">
                * Aqui Você pode alterar as configurações padrões do sistema
              </span>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-6 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 3: BOTÕES DE ACESSO (Fiel ao Print 3)
           =================================================================== */}
        {activeTab === "botoes_acesso" && (
          <div className="grid gap-6 rounded-b border border-t-0 border-slate-200 bg-background p-5 text-xs lg:grid-cols-[1.3fr_1fr]">
            {/* Coluna Esquerda: Configuração do Botão de Acesso + Arquivo HTML */}
            <div className="space-y-6">
              <div>
                <h2 className="border-b border-slate-400 pb-1.5 text-xs font-extrabold">
                  Configuração do Botão de Acesso:
                </h2>

                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block font-bold">
                      Largura do Botão
                      <input
                        type="number"
                        value={params.accessBtnWidth}
                        onChange={(e) =>
                          updateParam(
                            "accessBtnWidth",
                            Number(e.target.value) || 150
                          )
                        }
                        className="mt-1 block h-9 w-40 rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </label>
                    <span className="pb-2 font-bold">X</span>
                    <label className="block font-bold">
                      Altura do Botão
                      <input
                        type="number"
                        value={params.accessBtnHeight}
                        onChange={(e) =>
                          updateParam(
                            "accessBtnHeight",
                            Number(e.target.value) || 30
                          )
                        }
                        className="mt-1 block h-9 w-40 rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block font-bold">
                    Texto do Botão
                    <input
                      type="text"
                      value={params.accessBtnText}
                      onChange={(e) =>
                        updateParam("accessBtnText", e.target.value)
                      }
                      className="mt-1 block h-9 w-full max-w-md rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="block font-bold">
                      Cor do Botão
                      <select
                        value={params.accessBtnBgColor}
                        onChange={(e) =>
                          updateParam("accessBtnBgColor", e.target.value)
                        }
                        className="mt-1 block h-9 w-44 rounded border border-slate-300 bg-background px-2.5 text-xs"
                      >
                        {COLOR_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block font-bold">
                      Cor da fonte
                      <select
                        value={params.accessBtnTextColor}
                        onChange={(e) =>
                          updateParam("accessBtnTextColor", e.target.value)
                        }
                        className="mt-1 block h-9 w-44 rounded border border-slate-300 bg-background px-2.5 text-xs"
                      >
                        <option value="#373435">Escuro Padrão (#373435)</option>
                        <option value="#FFFFFF">Branco (#FFFFFF)</option>
                        <option value="#1E40AF">Azul (#1E40AF)</option>
                        <option value="#C00000">Vermelho (#C00000)</option>
                      </select>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="inline-flex h-10 w-52 items-center justify-center rounded border border-slate-400 bg-slate-100 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
                    >
                      Visualizar Botão
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="border-b border-slate-400 pb-1.5 text-xs font-extrabold">
                  Arquivo HTML:
                </h2>
                <p className="mt-2 text-[11px] font-bold">
                  Clique no botão abaixo para gerar um arquivo HTML e salve em
                  seu site!
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadHtmlFile("loja")}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Loja Virtual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadHtmlFile("login")}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Login Vendedores
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Aparência final do botão + Código para copiar */}
            <div className="flex flex-col justify-between rounded-lg bg-muted/40 p-5">
              <div className="text-center">
                <h3 className="text-xs font-bold">
                  Aparência final do botão de acesso:
                </h3>
                <div className="my-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => window.open(`/loja/${cnpj}`, "_blank")}
                    style={{
                      width: `${params.accessBtnWidth}px`,
                      height: `${params.accessBtnHeight}px`,
                      backgroundColor: params.accessBtnBgColor,
                      color: params.accessBtnTextColor,
                    }}
                    className="rounded border border-slate-400 text-xs font-semibold shadow-2xs"
                  >
                    {params.accessBtnText}
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-center text-[11px] font-bold">
                  Copie o Codigoabaixo e cole em seu site:
                </p>
                <textarea
                  readOnly
                  rows={6}
                  value={embedCodeSnippet}
                  className="w-full rounded border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 4: CONTA DE EMAIL (Fiel ao Print 4)
           =================================================================== */}
        {activeTab === "conta_email" && (
          <div className="rounded-b border border-t-0 border-slate-200 bg-background p-5 text-xs">
            {showEmailForm ? (
              <div className="space-y-4 rounded-lg border border-slate-300 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block font-bold">
                    Tipo:
                    <input
                      type="text"
                      value={emType}
                      onChange={(e) => setEmType(e.target.value)}
                      placeholder="Principal"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block font-bold sm:col-span-2">
                    E-mail:
                    <input
                      type="email"
                      value={emEmail}
                      onChange={(e) => setEmEmail(e.target.value)}
                      placeholder="igdecoracoes2023@gmail.com"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block font-bold">
                    Servidor SMTP:
                    <input
                      type="text"
                      value={emSmtp}
                      onChange={(e) => setEmSmtp(e.target.value)}
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block font-bold">
                    Porta:
                    <input
                      type="text"
                      value={emPort}
                      onChange={(e) => setEmPort(e.target.value)}
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block font-bold">
                    Status:
                    <select
                      value={emStatus}
                      onChange={(e) =>
                        setEmStatus(e.target.value as "ativo" | "inativo")
                      }
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    >
                      <option value="ativo">ativo</option>
                      <option value="inativo">inativo</option>
                    </select>
                  </label>
                </div>

                <label className="flex items-center gap-2 font-bold">
                  <input
                    type="checkbox"
                    checked={emDefault}
                    onChange={(e) => setEmDefault(e.target.checked)}
                    className="h-4 w-4 accent-[#E87E33]"
                  />
                  <span>Definir como Conta de Email Padrão</span>
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEmailAccount}
                    className="inline-flex h-9 items-center justify-center rounded bg-[#8CC63F] px-5 text-xs font-bold text-white hover:bg-[#7cb332]"
                  >
                    Incluir Conta
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={openNewEmailForm}
                  className="inline-flex h-9 items-center justify-center rounded bg-[#8CC63F] px-5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#7cb332]"
                >
                  Inserir
                </button>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                        <th className="w-36 border-r border-white px-3 py-2.5 font-extrabold">
                          Tipo
                        </th>
                        <th className="w-24 border-r border-white px-3 py-2.5 text-center font-extrabold">
                          Padrão
                        </th>
                        <th className="border-r border-white px-3 py-2.5 font-extrabold">
                          Email
                        </th>
                        <th className="w-24 border-r border-white px-3 py-2.5 text-center font-extrabold">
                          Status
                        </th>
                        <th className="w-28 px-3 py-2.5 text-center font-extrabold">
                          Opções
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.emailAccounts.map((acc) => (
                        <tr
                          key={acc.id}
                          className="border-b border-white bg-[#EFEFEF] text-slate-900"
                        >
                          <td className="border-r border-white px-3 py-2.5">
                            {acc.type}
                          </td>
                          <td className="border-r border-white px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={acc.isDefault}
                              onChange={() => handleToggleDefaultEmail(acc.id)}
                              className="h-4 w-4 accent-[#E87E33]"
                            />
                          </td>
                          <td className="border-r border-white px-3 py-2.5">
                            {acc.email}
                          </td>
                          <td className="border-r border-white px-3 py-2.5 text-center">
                            {acc.status}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingEmail(acc)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8FA8B2] text-white"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditEmailForm(acc)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEmailAccount(acc.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#C00000] text-white"
                              >
                                <X className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {viewingEmail && (
                  <div className="mt-3 rounded border bg-muted/40 p-3 text-xs">
                    <b>Conta {viewingEmail.type}:</b> {viewingEmail.email} •{" "}
                    <b>SMTP:</b> {viewingEmail.smtpHost || "smtp.gmail.com"}:
                    {viewingEmail.smtpPort || "587"} ({viewingEmail.status})
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-6 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA 5: BANNER'S (Fiel ao Print 5)
           =================================================================== */}
        {activeTab === "banners" && (
          <div className="rounded-b border border-t-0 border-slate-200 bg-background p-5 text-xs">
            <h2 className="border-b border-slate-400 pb-1.5 text-xs font-extrabold uppercase">
              BANNER&apos;S CADASTRADOS:
            </h2>

            {showBannerForm ? (
              <div className="mt-4 space-y-4 rounded-lg border border-slate-300 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block font-bold">
                    Nome do Banner:
                    <input
                      type="text"
                      value={bnName}
                      onChange={(e) => setBnName(e.target.value)}
                      placeholder="pedidos online"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block font-bold">
                    Ordem:
                    <input
                      type="number"
                      min={1}
                      value={bnOrder}
                      onChange={(e) =>
                        setBnOrder(Number(e.target.value) || 1)
                      }
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block font-bold">
                    Status:
                    <select
                      value={bnStatus}
                      onChange={(e) =>
                        setBnStatus(e.target.value as "ativo" | "inativo")
                      }
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    >
                      <option value="ativo">ativo</option>
                      <option value="inativo">inativo</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold">
                      Imagem do Banner (subir do computador):
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileChange}
                        className="mt-1 block text-xs"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Arquivo selecionado: <b>{bnImageName}</b>
                    </p>
                  </div>
                  <div>
                    <label className="block font-bold">
                      Link de Destino / Ação (opcional):
                      <input
                        type="text"
                        value={bnLinkUrl}
                        onChange={(e) => setBnLinkUrl(e.target.value)}
                        placeholder="Ex.: /loja/... ou https://..."
                        className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      URL para onde o cliente será redirecionado ao clicar no banner.
                    </p>
                  </div>
                </div>

                {bnImageUrl && (
                  <div className="rounded border bg-slate-50 p-2 text-center">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                      Pré-visualização da imagem selecionada:
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bnImageUrl}
                      alt="Preview do Banner"
                      className="mx-auto max-h-40 rounded object-contain shadow-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBannerForm(false)}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBanner}
                    className="inline-flex h-9 items-center justify-center rounded bg-[#8CC63F] px-5 text-xs font-bold text-white hover:bg-[#7cb332]"
                  >
                    Incluir Banner
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={openNewBannerForm}
                  className="inline-flex h-9 items-center justify-center rounded bg-[#8CC63F] px-5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#7cb332]"
                >
                  Inserir
                </button>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                        <th className="border-r border-white px-3 py-2.5 font-extrabold">
                          Nome
                        </th>
                        <th className="border-r border-white px-3 py-2.5 font-extrabold">
                          Imagem
                        </th>
                        <th className="w-20 border-r border-white px-3 py-2.5 text-center font-extrabold">
                          Ordem
                        </th>
                        <th className="w-24 border-r border-white px-3 py-2.5 text-center font-extrabold">
                          Status
                        </th>
                        <th className="w-28 px-3 py-2.5 text-center font-extrabold">
                          Opções
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.banners.map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-white bg-[#EFEFEF] text-slate-900"
                        >
                          <td className="border-r border-white px-3 py-2.5">
                            {b.name}
                          </td>
                          <td className="border-r border-white px-3 py-2.5">
                            {b.imageName}
                          </td>
                          <td className="border-r border-white px-3 py-2.5 text-center">
                            {b.order}
                          </td>
                          <td className="border-r border-white px-3 py-2.5 text-center">
                            {b.status}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingBanner(b)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8FA8B2] text-white"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditBannerForm(b)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBanner(b.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#C00000] text-white"
                              >
                                <X className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {viewingBanner && (
                  <div className="mt-3 rounded border bg-muted/40 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <b>Banner Selecionado:</b> {viewingBanner.name} ({viewingBanner.imageName}) &bull; Ordem {viewingBanner.order} &bull; Status: {viewingBanner.status}
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingBanner(null)}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Fechar visualização
                      </button>
                    </div>
                    {viewingBanner.imageUrl && (
                      <div className="max-w-md overflow-hidden rounded border bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingBanner.imageUrl}
                          alt={viewingBanner.name}
                          className="max-h-48 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <span className="text-[11px] text-muted-foreground">
                    * Clique em <b>Salvar</b> para gravar e publicar os banners na loja virtual (/loja/{cnpj}).
                  </span>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-6 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-slate-200"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA 6: LAYOUT (Cores, Nome na Vitrine e Mensagem de Topo)
           =================================================================== */}
        {activeTab === "layout" && (
          <div className="rounded-b border border-t-0 border-slate-200 bg-background p-5 text-xs">
            <h2 className="border-b border-slate-400 pb-1.5 text-xs font-extrabold uppercase">
              LAYOUT &amp; IDENTIDADE VISUAL DA VITRINE (/loja/{cnpj}):
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block font-bold">
                Nome Fantasia Exibido no Topo da Loja:
                <input
                  type="text"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                />
              </label>

              <label className="block font-bold">
                Cor Primária de Destaque (Hex):
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={layoutColor}
                    onChange={(e) => setLayoutColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-background p-0.5"
                  />
                  <input
                    type="text"
                    value={layoutColor}
                    onChange={(e) => setLayoutColor(e.target.value)}
                    className="h-9 flex-1 rounded border border-slate-300 bg-background px-3 font-mono text-sm"
                  />
                </div>
              </label>

              <label className="block font-bold sm:col-span-2">
                Mensagem de Boas-vindas / Faixa Informativa da Vitrine:
                <input
                  type="text"
                  value={layoutBannerText}
                  onChange={(e) => setLayoutBannerText(e.target.value)}
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-6 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Formas de Pagamento Ativas na Loja */}
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="border-b pb-2.5 text-sm font-extrabold uppercase tracking-wide">
          Formas de Pagamento Habilitadas no Checkout ({paymentMethods.length})
        </h2>

        <form
          action={createPaymentMethodAction}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            name="name"
            required
            placeholder="Nova forma de pagamento (ex.: Boleto 28 dias)"
            className="h-9 min-w-[220px] flex-1 rounded border border-slate-300 bg-background px-3 text-xs"
          />
          <select
            name="kind"
            defaultValue="pix"
            className="h-9 rounded border border-slate-300 bg-background px-2.5 text-xs"
          >
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="cartao">Cartão</option>
            <option value="faturado">Faturado S2000PLUS</option>
            <option value="dinheiro">Dinheiro / Entrega</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded bg-[#8CC63F] px-4 text-xs font-bold text-white hover:bg-[#7cb332]"
          >
            <Plus className="h-4 w-4" /> Inserir
          </button>
        </form>

        <ul className="mt-4 divide-y rounded border text-xs">
          {paymentMethods.map((pm) => (
            <li
              key={pm.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <div>
                <span className="font-bold">{pm.name}</span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {pm.kind}
                </span>
              </div>
              <form action={togglePaymentMethodAction}>
                <input type="hidden" name="id" value={pm.id} />
                <button
                  type="submit"
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    pm.isActive
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {pm.isActive ? "Ativa" : "Inativa"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

