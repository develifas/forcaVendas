"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil, X, ExternalLink } from "lucide-react";
import { createCustomerAction, deleteCustomerAction } from "@/modules/admin/actions";
import type {
  DbCustomerAddress,
  DbCustomerContact,
  DbStoreCustomer,
} from "@/lib/tenant-store";

interface Props {
  cnpj: string;
  tenantName: string;
  customers: DbStoreCustomer[];
}

function buildInitialAddresses(c?: DbStoreCustomer | null): DbCustomerAddress[] {
  if (!c) return [];
  if (c.addresses && c.addresses.length > 0) return c.addresses;
  if (c.address) {
    const cityParts = (c.city || "").split("-").map((s) => s.trim());
    return [
      {
        id: `addr-init-${c.id}`,
        type: "Principal",
        cep: c.cep || "",
        street: c.address,
        number: "",
        complement: "",
        neighborhood: c.neighborhood || "",
        city: cityParts[0] || c.city || "",
        uf: cityParts[1] || "ES",
        ibge: c.ibge || "",
      },
    ];
  }
  return [];
}

function buildInitialContacts(c?: DbStoreCustomer | null): DbCustomerContact[] {
  if (!c) return [];
  if (c.contacts && c.contacts.length > 0) return c.contacts;
  if (c.contactName || c.phone || c.email) {
    return [
      {
        id: `cnt-init-${c.id}`,
        type: "Principal",
        name: c.contactName || c.name,
        countryCode: c.countryCode || "1058",
        phone: c.phone || "",
        email: c.email || "",
        site: c.site || "",
      },
    ];
  }
  return [];
}

export function CustomerRegistrationManager({
  cnpj,
  tenantName,
  customers,
}: Props) {
  const nextAutoCode =
    1 +
    customers.reduce((max, c, idx) => Math.max(max, c.code ?? idx + 1), 0);

  // Aba ativa do wizard: Informações | Endereços | Contatos
  const [activeTab, setActiveTab] = useState<
    "informacoes" | "enderecos" | "contatos"
  >("informacoes");

  // Estado da Aba 1: INFORMAÇÕES DO CLIENTE
  const [editingCustomerId, setEditingCustomerId] = useState<string>("");
  const [codeDisplay, setCodeDisplay] = useState<string>("");
  const [integrationCode, setIntegrationCode] = useState<string>(
    String(nextAutoCode)
  );
  const [personType, setPersonType] = useState<"PF" | "PJ">("PF");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [name, setName] = useState<string>("");
  const [tradeName, setTradeName] = useState<string>("");
  const [document, setDocument] = useState<string>("");
  const [rgOrIe, setRgOrIe] = useState<string>("");
  const [login, setLogin] = useState<string>("");
  const [loginTouched, setLoginTouched] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [passwordTouched, setPasswordTouched] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Estado da Aba 2: CADASTRO DE ENDEREÇOS
  const [addresses, setAddresses] = useState<DbCustomerAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  const [viewingAddress, setViewingAddress] =
    useState<DbCustomerAddress | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrType, setAddrType] = useState<string>("Principal");
  const [addrCep, setAddrCep] = useState<string>("");
  const [addrStreet, setAddrStreet] = useState<string>("");
  const [addrNumber, setAddrNumber] = useState<string>("");
  const [addrComplement, setAddrComplement] = useState<string>("");
  const [addrNeighborhood, setAddrNeighborhood] = useState<string>("");
  const [addrCity, setAddrCity] = useState<string>("");
  const [addrUf, setAddrUf] = useState<string>("ES");
  const [addrIbge, setAddrIbge] = useState<string>("");

  // Estado da Aba 3: CADASTRO DE CONTATOS
  const [contacts, setContacts] = useState<DbCustomerContact[]>([]);
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [viewingContact, setViewingContact] =
    useState<DbCustomerContact | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [cntType, setCntType] = useState<string>("Principal");
  const [cntName, setCntName] = useState<string>("");
  const [cntCountryCode, setCntCountryCode] = useState<string>("1058");
  const [cntPhone, setCntPhone] = useState<string>("");
  const [cntEmail, setCntEmail] = useState<string>("");
  const [cntSite, setCntSite] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Reinicia o formulário para novo cadastro
  const handleReset = () => {
    setEditingCustomerId("");
    setCodeDisplay("");
    setIntegrationCode(String(nextAutoCode));
    setPersonType("PF");
    setStatus("active");
    setName("");
    setTradeName("");
    setDocument("");
    setRgOrIe("");
    setLogin("");
    setLoginTouched(false);
    setPassword("");
    setPasswordTouched(false);
    setDiscountPercent(0);
    setAddresses([]);
    setContacts([]);
    setShowAddressForm(false);
    setShowContactForm(false);
    setViewingAddress(null);
    setViewingContact(null);
    setFormError(null);
    setActiveTab("informacoes");
  };

  // Carrega um cliente existente no wizard de 3 abas para visualizar/editar
  const handleLoadCustomer = (
    c: DbStoreCustomer,
    targetTab: "informacoes" | "enderecos" | "contatos" = "informacoes"
  ) => {
    const cleanDoc = c.document.replace(/\D/g, "");
    const cleanHint = (c.passwordPlainHint || cleanDoc).replace(
      /\s*\((CPF|CNPJ)\)\s*$/i,
      ""
    );
    const inferredType =
      c.personType ?? (cleanDoc.length === 11 ? "PF" : "PJ");
    setEditingCustomerId(c.id);
    setCodeDisplay(String(c.code ?? 1));
    setIntegrationCode(c.integrationCode || String(c.code ?? 1));
    setPersonType(inferredType);
    setStatus(c.isActive ? "active" : "inactive");
    setName(c.name);
    setTradeName(c.tradeName || c.name);
    setDocument(cleanDoc);
    setRgOrIe(c.rgOrIe || "");
    setLogin(c.login || cleanDoc);
    setLoginTouched(Boolean(c.login && c.login !== cleanDoc));
    setPassword(cleanHint || cleanDoc);
    setPasswordTouched(Boolean(cleanHint && cleanHint !== cleanDoc));
    setDiscountPercent(c.discountPercent ?? 0);
    setAddresses(buildInitialAddresses(c));
    setContacts(buildInitialContacts(c));
    setShowAddressForm(false);
    setShowContactForm(false);
    setViewingAddress(null);
    setViewingContact(null);
    setFormError(null);
    setSavedBanner(null);
    setActiveTab(targetTab);
  };

  // Avança da Aba 1 (Informações) -> Aba 2 (Endereços)
  const handleNextFromInfo = () => {
    const cleanDoc = document.replace(/\D/g, "");
    if (!name.trim()) {
      setFormError("Informe o Nome do Cliente antes de avançar.");
      return;
    }
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setFormError(
        "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) somente números."
      );
      return;
    }
    setFormError(null);
    setActiveTab("enderecos");
  };

  // Abre sub-formulário para novo endereço (Print 3)
  const openNewAddressForm = () => {
    setEditingAddressId(null);
    setAddrType("Principal");
    setAddrCep("");
    setAddrStreet("");
    setAddrNumber("");
    setAddrComplement("");
    setAddrNeighborhood("");
    setAddrCity("");
    setAddrUf("ES");
    setAddrIbge("");
    setViewingAddress(null);
    setShowAddressForm(true);
  };

  // Abre sub-formulário para editar endereço existente
  const openEditAddressForm = (a: DbCustomerAddress) => {
    setEditingAddressId(a.id);
    setAddrType(a.type);
    setAddrCep(a.cep);
    setAddrStreet(a.street);
    setAddrNumber(a.number);
    setAddrComplement(a.complement);
    setAddrNeighborhood(a.neighborhood);
    setAddrCity(a.city);
    setAddrUf(a.uf);
    setAddrIbge(a.ibge);
    setViewingAddress(null);
    setShowAddressForm(true);
  };

  // Inclui / salva endereço na lista da Aba 2 (Print 3 -> Print 4)
  const handleIncludeAddress = () => {
    if (!addrStreet.trim()) return;
    const item: DbCustomerAddress = {
      id: editingAddressId || `addr-${Date.now()}`,
      type: addrType.trim() || "Principal",
      cep: addrCep.trim(),
      street: addrStreet.trim(),
      number: addrNumber.trim(),
      complement: addrComplement.trim(),
      neighborhood: addrNeighborhood.trim(),
      city: addrCity.trim(),
      uf: addrUf.trim().toUpperCase() || "ES",
      ibge: addrIbge.trim(),
    };
    if (editingAddressId) {
      setAddresses((prev) =>
        prev.map((x) => (x.id === editingAddressId ? item : x))
      );
    } else {
      setAddresses((prev) => [...prev, item]);
    }
    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const handleRemoveAddress = (id: string) => {
    setAddresses((prev) => prev.filter((x) => x.id !== id));
    if (viewingAddress?.id === id) setViewingAddress(null);
  };

  // Abre sub-formulário para novo contato (Aba 3)
  const openNewContactForm = () => {
    setEditingContactId(null);
    setCntType("Principal");
    setCntName(name || "");
    setCntCountryCode("1058");
    setCntPhone("");
    setCntEmail("");
    setCntSite("");
    setViewingContact(null);
    setShowContactForm(true);
  };

  const openEditContactForm = (c: DbCustomerContact) => {
    setEditingContactId(c.id);
    setCntType(c.type);
    setCntName(c.name);
    setCntCountryCode(c.countryCode || "1058");
    setCntPhone(c.phone);
    setCntEmail(c.email);
    setCntSite(c.site);
    setViewingContact(null);
    setShowContactForm(true);
  };

  const handleIncludeContact = () => {
    if (!cntName.trim() && !cntPhone.trim() && !cntEmail.trim()) return;
    const item: DbCustomerContact = {
      id: editingContactId || `cnt-${Date.now()}`,
      type: cntType.trim() || "Principal",
      name: cntName.trim() || name || "Contato Principal",
      countryCode: cntCountryCode.trim() || "1058",
      phone: cntPhone.trim(),
      email: cntEmail.trim(),
      site: cntSite.trim(),
    };
    if (editingContactId) {
      setContacts((prev) =>
        prev.map((x) => (x.id === editingContactId ? item : x))
      );
    } else {
      setContacts((prev) => [...prev, item]);
    }
    setShowContactForm(false);
    setEditingContactId(null);
  };

  const handleRemoveContact = (id: string) => {
    setContacts((prev) => prev.filter((x) => x.id !== id));
    if (viewingContact?.id === id) setViewingContact(null);
  };

  const tabBtnClass = (active: boolean) =>
    `px-4 py-1.5 text-xs font-bold rounded-t border border-b-0 transition ${
      active
        ? "bg-[#E87E33] text-white border-[#D66B20]"
        : "bg-[#95A5A6] text-white border-[#839496] hover:opacity-90"
    }`;

  const headerTitle =
    activeTab === "informacoes"
      ? "INFORMAÇÕES DO CLIENTE"
      : activeTab === "enderecos"
      ? "CADASTRO DE ENDEREÇOS"
      : "CADASTRO DE CONTATOS:";

  return (
    <div className="space-y-6">
      {/* Barra de caminho superior: Início | Administrar | Cadastros | Clientes (Fiel aos Prints 1 a 5) */}
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
          <span className="font-medium text-muted-foreground">Cadastros</span>
          <span className="text-muted-foreground">|</span>
          <span className="font-extrabold text-foreground">Clientes</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/loja/${cnpj}/clientes`}
            target="_blank"
            className="inline-flex h-8 items-center gap-1.5 rounded border bg-background px-3 text-xs font-bold shadow-2xs hover:bg-accent"
          >
            Ver na Loja ({tenantName}) <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Modal "Sucesso! O Cliente foi cadastrado!" (Fiel ao Print 6) */}
      {savedBanner && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sucesso-cliente-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-[330px] overflow-hidden rounded-xl border-2 border-[#B3E0F2] bg-white text-slate-900 shadow-2xl">
            <div className="bg-[#BCE2F5] px-4 py-2.5">
              <h2
                id="sucesso-cliente-title"
                className="text-sm font-extrabold text-[#0B258A]"
              >
                Sucesso!
              </h2>
            </div>
            <div className="px-4 pb-4 pt-3">
              <p className="min-h-[60px] text-xs font-medium text-slate-900">
                {savedBanner}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSavedBanner(null)}
                  className="inline-flex h-7 items-center justify-center rounded border-2 border-slate-900 bg-white px-5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL DO WIZARD EM 3 ABAS: Informações | Endereços | Contatos */}
      <form
        action={async (fd) => {
          const cleanDoc = document.replace(/\D/g, "");
          const finalLogin = (login || cleanDoc).trim();
          const finalPassword = (password || cleanDoc).trim();
          await createCustomerAction(fd);
          setSavedBanner(
            `O Cliente foi cadastrado! Login criado: ${finalLogin} | Senha criada: ${finalPassword}`
          );
          handleReset();
        }}
        className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
      >
        {/* Campos ocultos sincronizados com todas as 3 abas */}
        <input type="hidden" name="cnpj" value={cnpj} />
        <input type="hidden" name="id" value={editingCustomerId} />
        <input type="hidden" name="integrationCode" value={integrationCode} />
        <input type="hidden" name="personType" value={personType} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="tradeName" value={tradeName || name} />
        <input
          type="hidden"
          name="document"
          value={document.replace(/\D/g, "")}
        />
        <input type="hidden" name="rgOrIe" value={rgOrIe} />
        <input
          type="hidden"
          name="login"
          value={login || document.replace(/\D/g, "")}
        />
        <input
          type="hidden"
          name="password"
          value={password || document.replace(/\D/g, "")}
        />
        <input
          type="hidden"
          name="discountPercent"
          value={String(discountPercent)}
        />
        <input
          type="hidden"
          name="addressesJson"
          value={JSON.stringify(addresses)}
        />
        <input
          type="hidden"
          name="contactsJson"
          value={JSON.stringify(contacts)}
        />

        {/* Cabeçalho com Título à esquerda e Abas (Informações | Endereços | Contatos) à direita */}
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-400 pb-0">
          <h1 className="pb-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {headerTitle}
          </h1>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("informacoes")}
              className={tabBtnClass(activeTab === "informacoes")}
            >
              Informações
            </button>
            <button
              type="button"
              onClick={handleNextFromInfo}
              className={tabBtnClass(activeTab === "enderecos")}
            >
              Endereços
            </button>
            <button
              type="button"
              onClick={() => {
                if (!name.trim() || document.replace(/\D/g, "").length < 11) {
                  handleNextFromInfo();
                  return;
                }
                setActiveTab("contatos");
              }}
              className={tabBtnClass(activeTab === "contatos")}
            >
              Contatos
            </button>
          </div>
        </div>

        {formError && (
          <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600">
            {formError}
          </div>
        )}

        {/* ===================================================================
            ABA 1: INFORMAÇÕES DO CLIENTE (Fiel ao Print 1)
           =================================================================== */}
        {activeTab === "informacoes" && (
          <div className="mt-6 space-y-4 text-xs">
            {/* Linha 1: Código | Cód. Integração | Tipo de Cliente | Status */}
            <div className="grid gap-4 sm:grid-cols-4">
              <label className="block font-bold">
                Código:
                <input
                  type="text"
                  readOnly
                  value={codeDisplay}
                  placeholder="Automático"
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-muted/50 px-3 text-sm text-muted-foreground"
                />
              </label>

              <label className="block font-bold">
                Cód. Integração:
                <input
                  type="text"
                  value={integrationCode}
                  onChange={(e) => setIntegrationCode(e.target.value)}
                  placeholder="Ex.: 2"
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                />
              </label>

              <label className="block font-bold">
                Tipo de Cliente:
                <select
                  value={personType}
                  onChange={(e) =>
                    setPersonType(e.target.value as "PF" | "PJ")
                  }
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                >
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </label>

              <label className="block font-bold">
                Status:
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "active" | "inactive")
                  }
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </div>

            {/* Linha 2: Nome do Cliente (e Nome Fantasia se PJ) */}
            <div
              className={`grid gap-4 ${
                personType === "PJ" ? "sm:grid-cols-2" : "sm:grid-cols-1"
              }`}
            >
              <label className="block font-bold">
                {personType === "PF"
                  ? "Nome do Cliente:"
                  : "Nome do Cliente / Razão Social:"}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    personType === "PF"
                      ? "Ex.: Elifas de Oliveira"
                      : "Ex.: PRO CONTROL - CONTROLES INFORMATIZADOS LTDA"
                  }
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                />
              </label>

              {personType === "PJ" && (
                <label className="block font-bold">
                  Nome Fantasia:
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex.: PRO-CONTROLL SISTEMAS E TECNOLOGIA"
                    className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                  />
                </label>
              )}
            </div>

            {/* Linha 3: CPF/CNPJ (somente números) + RG/IE */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block font-bold">
                {personType === "PF"
                  ? "CPF: (somente números)"
                  : "CNPJ: (somente números)"}
                <input
                  type="text"
                  inputMode="numeric"
                  value={document}
                  onChange={(e) => {
                    const nextDoc = e.target.value.replace(/\D/g, "").slice(0, 14);
                    setDocument(nextDoc);
                    if (!loginTouched) setLogin(nextDoc);
                    if (!passwordTouched) setPassword(nextDoc);
                  }}
                  placeholder={
                    personType === "PF" ? "14182306775" : "35951466000157"
                  }
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 font-mono text-sm font-medium"
                />
              </label>

              <label className="block font-bold">
                {personType === "PF" ? "RG:" : "Inscrição Estadual / RG:"}
                <input
                  type="text"
                  value={rgOrIe}
                  onChange={(e) => setRgOrIe(e.target.value)}
                  placeholder="3179140"
                  className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                />
              </label>
            </div>

            {/* Linha 4: Login e Senha criados automaticamente no ato do cadastro (CPF/CNPJ) + Desconto B2B */}
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Credenciais de Acesso do Cliente (Criadas Automaticamente no Ato do Cadastro)
                </span>
                <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  Padrão: Login e Senha = {personType === "PF" ? "CPF" : "CNPJ"}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block font-bold">
                  Login do Cliente ({personType === "PF" ? "CPF" : "CNPJ"}):
                  <input
                    type="text"
                    value={login || document}
                    onChange={(e) => {
                      setLoginTouched(true);
                      setLogin(e.target.value.trim());
                    }}
                    placeholder={
                      document ||
                      (personType === "PF" ? "14182306775" : "35951466000157")
                    }
                    className="mt-1 block h-8 w-full rounded border border-slate-300 bg-background px-3 font-mono text-xs font-bold"
                  />
                </label>

                <label className="block font-bold">
                  Senha de Acesso (padrão = {personType === "PF" ? "CPF" : "CNPJ"}):
                  <input
                    type="text"
                    value={password || document}
                    onChange={(e) => {
                      setPasswordTouched(true);
                      setPassword(e.target.value);
                    }}
                    placeholder={
                      document ||
                      "Preenchida automaticamente com o CPF/CNPJ"
                    }
                    className="mt-1 block h-8 w-full rounded border border-slate-300 bg-background px-3 font-mono text-xs font-bold"
                  />
                </label>

                <label className="block font-bold">
                  Desconto Comercial Exclusivo na Loja (%):
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={discountPercent}
                    onChange={(e) =>
                      setDiscountPercent(Number(e.target.value) || 0)
                    }
                    className="mt-1 block h-8 w-full rounded border border-slate-300 bg-background px-3 text-xs font-bold"
                  />
                </label>
              </div>
            </div>

            {/* Botões Inferiores: Cancelar | Próxima etapa (Fiel ao Print 1) */}
            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleNextFromInfo}
                className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
              >
                Próxima etapa
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 2: CADASTRO DE ENDEREÇOS (Fiel aos Prints 2, 3 e 4)
           =================================================================== */}
        {activeTab === "enderecos" && (
          <div className="mt-5 space-y-5 text-xs">
            {showAddressForm ? (
              /* Sub-formulário de Inclusão/Edição de Endereço (Fiel ao Print 3) */
              <div className="rounded-lg border border-slate-300 bg-background p-5 shadow-xs">
                <div className="grid gap-4 sm:grid-cols-[160px_140px_1fr]">
                  <label className="block font-bold">
                    Tipo de Endereço:
                    <input
                      type="text"
                      value={addrType}
                      onChange={(e) => setAddrType(e.target.value)}
                      placeholder="Principal"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    CEP:
                    <input
                      type="text"
                      value={addrCep}
                      onChange={(e) => setAddrCep(e.target.value)}
                      placeholder="29177-185"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    Endereço:
                    <input
                      type="text"
                      value={addrStreet}
                      onChange={(e) => setAddrStreet(e.target.value)}
                      placeholder="Rua agapanto"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[110px_200px_1fr]">
                  <label className="block font-bold">
                    Número:
                    <input
                      type="text"
                      value={addrNumber}
                      onChange={(e) => setAddrNumber(e.target.value)}
                      placeholder="192"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    Complemento:
                    <input
                      type="text"
                      value={addrComplement}
                      onChange={(e) => setAddrComplement(e.target.value)}
                      placeholder="casa"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    Bairro:
                    <input
                      type="text"
                      value={addrNeighborhood}
                      onChange={(e) => setAddrNeighborhood(e.target.value)}
                      placeholder="cascata"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_90px_240px]">
                  <label className="block font-bold">
                    Cidade:
                    <input
                      type="text"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      placeholder="Serra"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    UF:
                    <input
                      type="text"
                      maxLength={2}
                      value={addrUf}
                      onChange={(e) => setAddrUf(e.target.value.toUpperCase())}
                      placeholder="ES"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm uppercase"
                    />
                  </label>

                  <label className="block font-bold">
                    IBGE Cód. Município:
                    <input
                      type="text"
                      value={addrIbge}
                      onChange={(e) => setAddrIbge(e.target.value)}
                      placeholder="12345"
                      className="mt-1 block h-9 w-full rounded border border-red-300 bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleIncludeAddress}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-200 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-300"
                  >
                    Incluir
                  </button>
                </div>
              </div>
            ) : (
              /* Listagem de Endereços com botão [+] verde (Fiel aos Prints 2 e 4) */
              <>
                <div>
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    title="Adicionar novo endereço"
                    className="inline-flex h-8 w-8 items-center justify-center rounded bg-[#8CC63F] text-white shadow-xs transition hover:bg-[#7cb332]"
                  >
                    <Plus className="h-5 w-5 stroke-[3]" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                        <th className="w-36 border-r border-white px-3 py-2.5 font-extrabold">
                          Tipo
                        </th>
                        <th className="border-r border-white px-3 py-2.5 font-extrabold">
                          Rua
                        </th>
                        <th className="w-40 border-r border-white px-3 py-2.5 font-extrabold">
                          Cidade
                        </th>
                        <th className="w-16 border-r border-white px-3 py-2.5 text-center font-extrabold">
                          UF
                        </th>
                        <th className="w-28 px-3 py-2.5 text-center font-extrabold">
                          Opções
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {addresses.length === 0 ? (
                        <tr className="bg-[#EFEFEF]">
                          <td
                            colSpan={5}
                            className="px-3 py-3 font-medium text-red-600"
                          >
                            Você não possui endereços cadastrados
                          </td>
                        </tr>
                      ) : (
                        addresses.map((a) => (
                          <tr
                            key={a.id}
                            className="border-b border-white bg-[#EFEFEF] text-slate-900"
                          >
                            <td className="border-r border-white px-3 py-2.5">
                              {a.type}
                            </td>
                            <td className="border-r border-white px-3 py-2.5">
                              {a.street}
                              {a.number ? `, ${a.number}` : ""}
                            </td>
                            <td className="border-r border-white px-3 py-2.5">
                              {a.city}
                            </td>
                            <td className="border-r border-white px-3 py-2.5 text-center">
                              {a.uf}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingAddress(a)}
                                  title="Visualizar endereço"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8FA8B2] text-white hover:opacity-90"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditAddressForm(a)}
                                  title="Editar endereço"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white hover:opacity-90"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAddress(a.id)}
                                  title="Remover endereço"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#C00000] text-white hover:opacity-90"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {viewingAddress && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                    <div className="flex items-center justify-between border-b pb-1.5 font-bold">
                      <span>
                        Detalhes do Endereço ({viewingAddress.type})
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingAddress(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Fechar [X]
                      </button>
                    </div>
                    <p className="mt-2">
                      <b>Logradouro:</b> {viewingAddress.street},{" "}
                      {viewingAddress.number || "S/N"}{" "}
                      {viewingAddress.complement
                        ? `(${viewingAddress.complement})`
                        : ""}
                    </p>
                    <p>
                      <b>Bairro:</b> {viewingAddress.neighborhood || "—"} •{" "}
                      <b>Cidade/UF:</b> {viewingAddress.city} -{" "}
                      {viewingAddress.uf}
                    </p>
                    <p>
                      <b>CEP:</b> {viewingAddress.cep || "—"} • <b>IBGE:</b>{" "}
                      {viewingAddress.ibge || "—"}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab("informacoes")}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("contatos")}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Próxima etapa
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA 3: CADASTRO DE CONTATOS (Fiel ao Print 5)
           =================================================================== */}
        {activeTab === "contatos" && (
          <div className="mt-5 space-y-5 text-xs">
            {showContactForm ? (
              <div className="rounded-lg border border-slate-300 bg-background p-5 shadow-xs">
                <div className="grid gap-4 sm:grid-cols-[160px_1fr_120px]">
                  <label className="block font-bold">
                    Tipo de Contato:
                    <input
                      type="text"
                      value={cntType}
                      onChange={(e) => setCntType(e.target.value)}
                      placeholder="Principal"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    Nome do Contato:
                    <input
                      type="text"
                      value={cntName}
                      onChange={(e) => setCntName(e.target.value)}
                      placeholder="Ex.: Elifas de Oliveira"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    Cód. País:
                    <input
                      type="text"
                      value={cntCountryCode}
                      onChange={(e) => setCntCountryCode(e.target.value)}
                      placeholder="1058"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block font-bold">
                    Telefone:
                    <input
                      type="text"
                      value={cntPhone}
                      onChange={(e) => setCntPhone(e.target.value)}
                      placeholder="27 99999-0000"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    E-mail:
                    <input
                      type="email"
                      value={cntEmail}
                      onChange={(e) => setCntEmail(e.target.value)}
                      placeholder="contato@exemplo.com.br"
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>

                  <label className="block font-bold">
                    Site:
                    <input
                      type="text"
                      value={cntSite}
                      onChange={(e) => setCntSite(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleIncludeContact}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-200 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-300"
                  >
                    Incluir
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <button
                    type="button"
                    onClick={openNewContactForm}
                    title="Adicionar novo contato"
                    className="inline-flex h-8 w-8 items-center justify-center rounded bg-[#8CC63F] text-white shadow-xs transition hover:bg-[#7cb332]"
                  >
                    <Plus className="h-5 w-5 stroke-[3]" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                        <th className="w-36 border-r border-white px-3 py-2.5 font-extrabold">
                          Tipo
                        </th>
                        <th className="border-r border-white px-3 py-2.5 font-extrabold">
                          Nome
                        </th>
                        <th className="w-48 border-r border-white px-3 py-2.5 font-extrabold">
                          Telefone
                        </th>
                        <th className="w-28 px-3 py-2.5 text-center font-extrabold">
                          Opções
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.length === 0 ? (
                        <tr className="bg-[#EFEFEF]">
                          <td
                            colSpan={4}
                            className="px-3 py-3 font-medium text-red-600"
                          >
                            Você não possui contatos cadastrados
                          </td>
                        </tr>
                      ) : (
                        contacts.map((cnt) => (
                          <tr
                            key={cnt.id}
                            className="border-b border-white bg-[#EFEFEF] text-slate-900"
                          >
                            <td className="border-r border-white px-3 py-2.5">
                              {cnt.type}
                            </td>
                            <td className="border-r border-white px-3 py-2.5">
                              {cnt.name}
                            </td>
                            <td className="border-r border-white px-3 py-2.5">
                              {cnt.phone || cnt.email || "—"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingContact(cnt)}
                                  title="Visualizar contato"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8FA8B2] text-white hover:opacity-90"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditContactForm(cnt)}
                                  title="Editar contato"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white hover:opacity-90"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContact(cnt.id)}
                                  title="Remover contato"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#C00000] text-white hover:opacity-90"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {viewingContact && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                    <div className="flex items-center justify-between border-b pb-1.5 font-bold">
                      <span>Detalhes do Contato ({viewingContact.type})</span>
                      <button
                        type="button"
                        onClick={() => setViewingContact(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Fechar [X]
                      </button>
                    </div>
                    <p className="mt-2">
                      <b>Nome:</b> {viewingContact.name} • <b>Telefone:</b>{" "}
                      {viewingContact.countryCode} {viewingContact.phone || "—"}
                    </p>
                    <p>
                      <b>E-mail:</b> {viewingContact.email || "—"} •{" "}
                      <b>Site:</b> {viewingContact.site || "—"}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab("enderecos")}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-extrabold text-slate-900 shadow-2xs hover:bg-slate-200"
                  >
                    Salvar e Concluir
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </form>

      {/* CARTEIRA DE CLIENTES CADASTRADOS (Com botões [👁️], [✏️] e [X] para carregar nas 3 abas ou excluir) */}
      <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide">
              Clientes Cadastrados ({customers.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Clique no lápis verde <b>[✏️]</b> para editar Informações,
              Endereços ou Contatos do cliente nas abas acima.
            </p>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                <th className="w-16 border-r border-white px-3 py-2 text-center font-extrabold">
                  Código
                </th>
                <th className="w-24 border-r border-white px-3 py-2 text-center font-extrabold">
                  Cód. Int.
                </th>
                <th className="border-r border-white px-3 py-2 font-extrabold">
                  Cliente
                </th>
                <th className="w-36 border-r border-white px-3 py-2 font-extrabold">
                  CPF / CNPJ
                </th>
                <th className="w-48 border-r border-white px-3 py-2 font-extrabold">
                  Login / Senha (Loja)
                </th>
                <th className="w-40 border-r border-white px-3 py-2 font-extrabold">
                  Cidade / Endereço
                </th>
                <th className="w-24 border-r border-white px-3 py-2 text-center font-extrabold">
                  Status
                </th>
                <th className="w-28 px-3 py-2 text-center font-extrabold">
                  Opções
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => {
                const customerLogin = c.login || c.document;
                const customerPass = (
                  c.passwordPlainHint || c.document
                ).replace(/\s*\((CPF|CNPJ)\)\s*$/i, "");
                return (
                <tr
                  key={c.id}
                  className="border-b border-white bg-[#EFEFEF] text-slate-900 hover:bg-slate-200/70"
                >
                  <td className="border-r border-white px-3 py-2.5 text-center font-mono font-bold">
                    {c.code ?? idx + 1}
                  </td>
                  <td className="border-r border-white px-3 py-2.5 text-center font-mono">
                    {c.integrationCode || c.code || idx + 1}
                  </td>
                  <td className="border-r border-white px-3 py-2.5 font-bold uppercase">
                    {c.name}
                  </td>
                  <td className="border-r border-white px-3 py-2.5 font-mono">
                    {c.document}
                  </td>
                  <td className="border-r border-white px-3 py-2.5 font-mono text-[11px]">
                    <div>
                      <span className="font-bold text-slate-600">Login:</span>{" "}
                      <span className="font-extrabold text-emerald-700">
                        {customerLogin}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-600">Senha:</span>{" "}
                      <span className="font-extrabold text-slate-900">
                        {customerPass}
                      </span>
                    </div>
                  </td>
                  <td className="border-r border-white px-3 py-2.5">
                    {c.city || "—"}
                  </td>
                  <td className="border-r border-white px-3 py-2.5 text-center font-semibold">
                    {c.isActive ? "Ativo" : "Inativo"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleLoadCustomer(c, "enderecos")}
                        title="Ver Endereços e Contatos"
                        className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8FA8B2] text-white hover:opacity-90"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadCustomer(c, "informacoes")}
                        title="Editar Cliente"
                        className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white hover:opacity-90"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <form action={deleteCustomerAction} className="inline">
                        <input type="hidden" name="cnpj" value={cnpj} />
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          title="Excluir cliente"
                          className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#C00000] text-white hover:opacity-90"
                        >
                          <X className="h-3.5 w-3.5 stroke-[2.5]" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
