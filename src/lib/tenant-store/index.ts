// SOMENTE SERVIDOR: Banco de dados multi-CNPJ unificado (Tabela Central de Roteamento + BDs por CNPJ).
// Persiste em .fv-data/platform-db.json no ambiente local e sincroniza Painel SaaS <-> /loja/[cnpj].

import fs from "fs";
import path from "path";
import { hashPassword } from "@/lib/security";
import { onlyDigits } from "@/lib/cnpj";

export type SaasPlanId = "starter" | "pro" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface SaasPlanDefinition {
  id: SaasPlanId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  maxProducts: number;
  maxUsers: number;
  features: string[];
}

export const SAAS_PLANS: SaasPlanDefinition[] = [
  {
    id: "starter",
    name: "Plano Essencial",
    tagline: "Para lojas iniciando vendas e cotações online",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 8400,
    maxProducts: 300,
    maxUsers: 3,
    features: [
      "Até 3 usuários internos",
      "Até 300 produtos no catálogo",
      "Vitrine pública /loja/[cnpj]",
      "Carrinho e pedidos online",
    ],
  },
  {
    id: "pro",
    name: "Plano Profissional",
    tagline: "Ideal para distribuidoras e atacado/varejo",
    monthlyPriceCents: 19900,
    yearlyPriceCents: 16900,
    maxProducts: 2000,
    maxUsers: 10,
    features: [
      "Até 10 usuários simultâneos",
      "Até 2.000 produtos cadastrados",
      "Preços diferenciados / desconto por cliente (B2B)",
      "Módulo de Orçamentos Sob Consulta",
      "Importação e Exportação CSV",
    ],
  },
  {
    id: "enterprise",
    name: "Plano Enterprise Multi-BD",
    tagline: "Operação ilimitada com banco dedicado por CNPJ",
    monthlyPriceCents: 39900,
    yearlyPriceCents: 33900,
    maxProducts: 99999,
    maxUsers: 100,
    features: [
      "Produtos e pedidos ilimitados",
      "Até 100 usuários com níveis de acesso (RBAC)",
      "Banco isolado <cnpj>_BDpdon dedicado",
      "Múltiplas filiais / CNPJs no mesmo painel",
      "Relatórios Curva ABC e auditoria completa",
    ],
  },
];

export interface TenantRouteRecord {
  tenantId: string;
  cnpj: string;
  name: string;
  slug: string;
  /** Código da empresa usado no login FV / S2000PLUS (ex.: pro-control, computiva, ig_fv) */
  companyCode?: string;
  dbName: string;
  supabaseUrl: string;
  anonKey: string;
  serviceKeyEncrypted?: string;
  status: "active" | "suspended" | "provisioning";
  planId?: SaasPlanId;
  billingCycle?: BillingCycle;
  primaryColor: string;
  primaryForeground: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  bannerText: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbProductGroup {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface DbProduct {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit: string;
  priceCents: number | null; // null = Sob consulta
  imageUrl: string | null;
  imageUrls: string[];
  groupId: string | null;
  inStock: boolean;
  isActive: boolean;
  salesCount: number;
  createdAt: string;
}

export interface DbCustomerAddress {
  id: string;
  /** Ex.: Principal, Entrega, Cobrança */
  type: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  uf: string;
  ibge: string;
}

export interface DbCustomerContact {
  id: string;
  /** Ex.: Principal, Financeiro, Compras */
  type: string;
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  site: string;
}

export interface DbStoreCustomer {
  id: string;
  /** Código sequencial do cliente (ex.: 1, 2, 3 — exibido na tela Selecionar Cliente) */
  code?: number;
  /** Código de integração com o S2000PLUS (ex.: "2", "234") */
  integrationCode?: string;
  /** Tipo de Cliente: Pessoa Física (PF) ou Pessoa Jurídica (PJ) */
  personType?: "PF" | "PJ";
  document: string; // CPF (11) ou CNPJ (14) somente dígitos
  /** RG (Pessoa Física) ou Inscrição Estadual (Pessoa Jurídica) */
  rgOrIe?: string;
  /** Usuário do cliente no lançamento de vendas (por padrão é o próprio CNPJ/CPF) */
  login?: string;
  /** Vendedor responsável pela carteira deste cliente (ex.: adilson, admin) */
  sellerUsername?: string;
  name: string;
  tradeName?: string;
  email: string;
  phone: string;
  passwordHash: string;
  /** Indicação amigável no painel (ex.: "CNPJ (padrão)" ou "Personalizada") */
  passwordPlainHint?: string;
  discountPercent: number; // Desconto exclusivo B2B/cliente cadastrado
  /** Lista completa de endereços (Aba 2 do Cadastro de Clientes) */
  addresses?: DbCustomerAddress[];
  /** Lista completa de contatos (Aba 3 do Cadastro de Clientes) */
  contacts?: DbCustomerContact[];
  /** Dados principais sincronizados para a Aba Entrega do Finalizar Pedido */
  address?: string;
  neighborhood?: string;
  city?: string;
  cep?: string;
  ibge?: string;
  contactName?: string;
  countryCode?: string;
  site?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DbPaymentMethod {
  id: string;
  name: string;
  kind: "pix" | "boleto" | "cartao" | "faturado" | "dinheiro";
  isActive: boolean;
}

export type OrderStatus = "orcamento" | "pendente" | "aprovado" | "faturado" | "cancelado";

export interface DbOrderItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  unitPriceCents: number | null;
  subtotalCents: number | null;
}

export interface DbStoreOrder {
  id: string;
  code: string;
  customerId: string | null;
  customerName: string;
  customerDocument: string | null;
  /** Vendedor que realizou o lançamento pelo Força de Vendas (FV) */
  sellerId?: string | null;
  sellerName?: string | null;
  paymentMethodId: string;
  paymentMethodName: string;
  /** Dados de Acréscimo / Desconto e Entrega do fluxo Finalizar */
  subtotalCents?: number;
  adjustmentType?: "acrescimo" | "desconto";
  adjustmentPercent?: number;
  adjustmentCents?: number;
  deliveryMethod?: string;
  deliveryAddress?: {
    address: string;
    neighborhood: string;
    city: string;
    cep: string;
    ibge: string;
  };
  deliveryContact?: {
    contactName: string;
    countryCode: string;
    phone: string;
    email: string;
    site: string;
  };
  status: OrderStatus;
  totalCents: number;
  hasConsultItems: boolean;
  notes: string;
  items: DbOrderItem[];
  createdAt: string;
  updatedAt: string;
  /** Código do pedido no ERP (preenchido após a confirmação de recebimento pelo ERP) */
  erpCode?: string | null;
  /** Data/hora em que o ERP confirmou o recebimento do pedido */
  erpSyncedAt?: string | null;
}

/** Formato de troca de dados com o ERP (ainda em definição pela equipe). */
export type ErpIntegrationMode = "undefined" | "agent_api" | "txt" | "csv" | "json" | "database";

export interface DbErpSyncLog {
  at: string;
  level: "info" | "warn" | "error";
  action: string;
  message: string;
}

/** Configuração de integração com o ERP (ex.: S2000Plus) por empresa. Neutra quanto ao formato. */
export interface DbErpIntegration {
  enabled: boolean;
  erpName: string;
  mode: ErpIntegrationMode;
  /** Informativo: onde ficam os arquivos/banco no computador do cliente (a definir) */
  dataLocation: string;
  /** Observações da equipe sobre layout/campos (a definir) */
  notes: string;
  intervalMinutes: number;
  /** SHA-256 do token (o token em texto puro só é exibido uma vez) */
  tokenHash: string | null;
  tokenPrefix: string | null;
  tokenCreatedAt: string | null;
  lastHeartbeatAt: string | null;
  lastCatalogSyncAt: string | null;
  lastOrdersPullAt: string | null;
  agentVersion: string | null;
  logs: DbErpSyncLog[];
}

import { ACCESS_LEVEL_MODULES, type AccessLevelModuleKey } from "./constants";
export { ACCESS_LEVEL_MODULES, type AccessLevelModuleKey };

export interface DbAccessLevelPermission {
  moduleKey: string;
  moduleLabel: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canReport: boolean;
}

export interface DbAccessLevel {
  id: string;
  code: number;
  name: string;
  isProtected?: boolean;
  permissions: DbAccessLevelPermission[];
  createdAt: string;
}

export function createDefaultAccessLevels(now = new Date().toISOString()): DbAccessLevel[] {
  const buildPerms = (
    custom: Partial<
      Record<
        string,
        {
          canView?: boolean;
          canCreate?: boolean;
          canUpdate?: boolean;
          canDelete?: boolean;
          canReport?: boolean;
        }
      >
    >,
    defaultAll = false
  ): DbAccessLevelPermission[] =>
    ACCESS_LEVEL_MODULES.map((m) => {
      const ov = custom[m.key];
      return {
        moduleKey: m.key,
        moduleLabel: m.label,
        canView: ov?.canView ?? defaultAll,
        canCreate: ov?.canCreate ?? defaultAll,
        canUpdate: ov?.canUpdate ?? defaultAll,
        canDelete: ov?.canDelete ?? defaultAll,
        canReport: ov?.canReport ?? defaultAll,
      };
    });

  return [
    {
      id: "lvl-1",
      code: 1,
      name: "Administrador",
      isProtected: true,
      permissions: buildPerms({}, true),
      createdAt: now,
    },
    {
      id: "lvl-2",
      code: 2,
      name: "ACESSO CAIXA",
      isProtected: false,
      // Fiel ao Print 3: Cliente (Consultar), Produto (Consultar), Venda (Consultar, Incluir, Excluir)
      permissions: buildPerms(
        {
          cliente: { canView: true },
          produto: { canView: true },
          venda: { canView: true, canCreate: true, canDelete: true },
        },
        false
      ),
      createdAt: now,
    },
    {
      id: "lvl-3",
      code: 3,
      name: "Adm",
      isProtected: false,
      permissions: buildPerms(
        {
          nivel_acesso: {
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: false,
            canReport: true,
          },
        },
        true
      ),
      createdAt: now,
    },
    {
      id: "lvl-4",
      code: 4,
      name: "Parceiro Comercial",
      isProtected: false,
      permissions: buildPerms(
        {
          cliente: { canView: true, canCreate: true, canUpdate: true },
          consultar: { canView: true },
          produto: { canView: true },
          venda: { canView: true, canCreate: true, canReport: true },
        },
        false
      ),
      createdAt: now,
    },
  ];
}

export interface DbStaffUser {
  id: string;
  code?: number;
  /** Login do vendedor/usuário no FV (ex.: adilson, admin) */
  username?: string;
  name: string;
  email: string;
  passwordHash?: string;
  passwordPlainHint?: string;
  role: "owner" | "admin" | "seller" | "viewer";
  /** Vínculo com o Nível de Acesso cadastrado em Nivelacesso (ex.: lvl-1, lvl-2, lvl-4) */
  accessLevelId?: string;
  accessLevelName?: string;
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface DbStoreEmailAccount {
  id: string;
  type: string;
  isDefault: boolean;
  email: string;
  smtpHost?: string;
  smtpPort?: string;
  status: "ativo" | "inativo";
}

export interface DbStoreBanner {
  id: string;
  name: string;
  imageName: string;
  imageUrl?: string;
  order: number;
  status: "ativo" | "inativo";
  isActive?: boolean;
  linkUrl?: string;
}

export interface DbStoreParameters {
  // Aba 1: Parâmetros (Print 1)
  sendOrderTxtToCompany: boolean;
  sendOrderCopyToCustomer: boolean;
  sendOrderCopyToCompany: boolean;
  enableVirtualStore: boolean;
  showProductPrices: "sim" | "nao";
  showPromoOnHome: boolean;
  promoItemsCount: number;
  showBestSellersOnHome: boolean;
  bestSellersItemsCount: number;
  showMostViewedOnHome: boolean;
  mostViewedItemsCount: number;
  useSitePriceForS2000Import: boolean;
  showPhotoOnOrderCopy: boolean;

  // Aba 2: Dados Gerais (Print 2)
  site: string;
  email: string;
  phone1Ddd: string;
  phone1Number: string;
  phone2Ddd: string;
  phone2Number: string;
  facebook: string;
  twitter: string;
  instagram: string;
  logoUrl?: string;

  // Aba 3: Botões de Acesso (Print 3)
  accessBtnWidth: number;
  accessBtnHeight: number;
  accessBtnText: string;
  accessBtnBgColor: string;
  accessBtnTextColor: string;

  // Aba 4: Conta de Email (Print 4)
  emailAccounts: DbStoreEmailAccount[];

  // Aba 5: Banner's (Print 5)
  banners: DbStoreBanner[];
}

export function createDefaultStoreParameters(cnpj: string): DbStoreParameters {
  const isIg = cnpj === "11222333000181";
  const isComputiva = cnpj === "03358951000198";

  return {
    sendOrderTxtToCompany: false,
    sendOrderCopyToCustomer: true,
    sendOrderCopyToCompany: true,
    enableVirtualStore: true,
    showProductPrices: "sim",
    showPromoOnHome: false,
    promoItemsCount: 50,
    showBestSellersOnHome: true,
    bestSellersItemsCount: 50,
    showMostViewedOnHome: false,
    mostViewedItemsCount: 50,
    useSitePriceForS2000Import: false,
    showPhotoOnOrderCopy: true,

    site: isComputiva ? "computiva.com.br" : "pro-controll.com.br",
    email: isIg
      ? "igdecoracoes@hotmail.com"
      : isComputiva
      ? "comercial@computiva.com.br"
      : "adilsonr43@gmail.com",
    phone1Ddd: "27",
    phone1Number: isIg ? "998103723" : "33395857",
    phone2Ddd: "27",
    phone2Number: isIg ? "998103723" : "33395857",
    facebook: "",
    twitter: "",
    instagram: "",
    logoUrl: "",

    accessBtnWidth: 150,
    accessBtnHeight: 30,
    accessBtnText: "Força de Venda",
    accessBtnBgColor: "#EFEFEF",
    accessBtnTextColor: "#373435",

    emailAccounts: [
      {
        id: "em-1",
        type: "Principal",
        isDefault: true,
        email: isIg
          ? "igdecoracoes2023@gmail.com"
          : isComputiva
          ? "comercial@computiva.com.br"
          : "adilsonr43@gmail.com",
        smtpHost: "smtp.gmail.com",
        smtpPort: "587",
        status: "ativo",
      },
    ],

    banners: [],
  };
}

export interface TenantDatabaseInstance {
  dbName: string;
  cnpj: string;
  groups: DbProductGroup[];
  products: DbProduct[];
  customers: DbStoreCustomer[];
  paymentMethods: DbPaymentMethod[];
  orders: DbStoreOrder[];
  staffUsers?: DbStaffUser[];
  accessLevels?: DbAccessLevel[];
  storeParameters?: DbStoreParameters;
  integration?: DbErpIntegration;
}

export interface PlatformDataFile {
  version: number;
  routes: TenantRouteRecord[];
  databases: Record<string, TenantDatabaseInstance>; // chave = cnpj (14 dígitos)
}

const DATA_DIR = path.join(process.cwd(), ".fv-data");
const DATA_FILE = path.join(DATA_DIR, "platform-db.json");

function createInitialSeed(): PlatformDataFile {
  const now = new Date().toISOString();
  const demoPassHash = hashPassword("demo123");
  const pass5122Hash = hashPassword("5122");
  const passIgHash = hashPassword("ig@123");

  const routes: TenantRouteRecord[] = [
    {
      tenantId: "b2222222-2222-2222-2222-222222222222",
      cnpj: "35951466000157",
      name: "PRO-CONTROL (ControlPDV Informática)",
      slug: "pro-control",
      companyCode: "pro-control",
      dbName: "35951466000157_BDpdon",
      supabaseUrl: "",
      anonKey: "",
      status: "active",
      planId: "enterprise",
      billingCycle: "monthly",
      primaryColor: "#10B981",
      primaryForeground: "#FFFFFF",
      accentColor: "#D1FAE5",
      contactEmail: "procontroladm@terra.com.br",
      contactPhone: "(27) 99620-5857",
      bannerText: "Automação comercial S2000PLUS, hardware e sistemas NFCe/NFe com pronta entrega.",
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: "d4444444-4444-4444-4444-444444444444",
      cnpj: "03358951000198",
      name: "COMPUTIVA Tecnologia & Sistemas",
      slug: "computiva",
      companyCode: "computiva",
      dbName: "03358951000198_BDpdon",
      supabaseUrl: "",
      anonKey: "",
      status: "active",
      planId: "enterprise",
      billingCycle: "monthly",
      primaryColor: "#0EA5E9",
      primaryForeground: "#FFFFFF",
      accentColor: "#E0F2FE",
      contactEmail: "comercial@computiva.com.br",
      contactPhone: "(27) 3200-5122",
      bannerText: "Integrada ao S2000PLUS e Força de Vendas (CNPJ 03.358.951/0001-98).",
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: "a1111111-1111-1111-1111-111111111111",
      cnpj: "11222333000181",
      name: "IG Decoração",
      slug: "ig_fv",
      companyCode: "ig_fv",
      dbName: "11222333000181_BDpdon",
      supabaseUrl: "",
      anonKey: "",
      status: "active",
      planId: "pro",
      billingCycle: "monthly",
      primaryColor: "#44C5ED",
      primaryForeground: "#0F172A",
      accentColor: "#E0F2FE",
      contactEmail: "atendimento@igdecoracao.com.br",
      contactPhone: "(27) 3339-5857",
      bannerText: "Pedidos online direto da distribuidora. Monte seu carrinho ou solicite orçamento.",
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: "c3333333-3333-3333-3333-333333333333",
      cnpj: "00000000000191",
      name: "Alfa Distribuidora Matriz",
      slug: "alfa-distribuidora",
      companyCode: "alfa",
      dbName: "00000000000191_BDpdon",
      supabaseUrl: "",
      anonKey: "",
      status: "active",
      planId: "starter",
      billingCycle: "monthly",
      primaryColor: "#6366F1",
      primaryForeground: "#FFFFFF",
      accentColor: "#E0E7FF",
      contactEmail: "comercial@alfadistribuidora.com.br",
      contactPhone: "(11) 4002-8922",
      bannerText: "Catálogo B2B Atacadista com condições especiais para clientes cadastrados.",
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Banco 1: IG Decoração (11222333000181_BDpdon)
  const dbIg: TenantDatabaseInstance = {
    dbName: "11222333000181_BDpdon",
    cnpj: "11222333000181",
    groups: [
      { id: "g1", name: "Decoração", parentId: null, sortOrder: 1, isActive: true },
      { id: "g1a", name: "Vasos", parentId: "g1", sortOrder: 1, isActive: true },
      { id: "g1b", name: "Esculturas", parentId: "g1", sortOrder: 2, isActive: true },
      { id: "g1c", name: "Caixas", parentId: "g1", sortOrder: 3, isActive: true },
      { id: "g1d", name: "Bandejas", parentId: "g1", sortOrder: 4, isActive: true },
      { id: "g1e", name: "Luminárias", parentId: "g1", sortOrder: 5, isActive: true },
      { id: "g1f", name: "Taças de Vidro", parentId: "g1", sortOrder: 6, isActive: true },
      { id: "g1g", name: "Mesa Posta", parentId: "g1", sortOrder: 7, isActive: true },
      { id: "g2", name: "Uso e Consumo", parentId: null, sortOrder: 2, isActive: true },
      { id: "g3", name: "Envio & Etiquetas", parentId: null, sortOrder: 3, isActive: true },
    ],
    products: [
      {
        id: "p1",
        sku: "IG-001",
        name: "CJ Seis Copos de Vidro Borossilicato Cupcake 400ml",
        brand: "Ichendorf",
        description: "Conjunto com seis copos de vidro borossilicato com acabamento cupcake.\nCapacidade de 400 ml cada. Resistente a variações de temperatura.",
        unit: "UN",
        priceCents: 28618,
        imageUrl: "/produtos/p1.jpg",
        imageUrls: ["/produtos/p1.jpg"],
        groupId: "g1f",
        inStock: true,
        isActive: true,
        salesCount: 90,
        createdAt: now,
      },
      {
        id: "p2",
        sku: "IG-002",
        name: "Mickey de Resina Incolor 19x10,5x28cm",
        brand: "DIV",
        description: "Escultura decorativa em resina incolor, ideal para estantes e aparadores.",
        unit: "UN",
        priceCents: 38770,
        imageUrl: "/produtos/p2.jpg",
        imageUrls: ["/produtos/p2.jpg"],
        groupId: "g1b",
        inStock: true,
        isActive: true,
        salesCount: 80,
        createdAt: now,
      },
      {
        id: "p3",
        sku: "IG-003",
        name: "Escultura de Metal e Cristal 20x8x18cm",
        brand: "DIV",
        description: "Escultura em metal e cristal. Peça de decoração com acabamento artesanal.",
        unit: "UN",
        priceCents: 23960,
        imageUrl: "/produtos/p3.jpg",
        imageUrls: ["/produtos/p3.jpg"],
        groupId: "g1b",
        inStock: true,
        isActive: true,
        salesCount: 70,
        createdAt: now,
      },
      {
        id: "p4",
        sku: "IG-004",
        name: "Vaso Decorativo de Vidro Murano Âmbar",
        brand: "Cristais São Marcos",
        description: "Vaso artesanal em vidro estilo Murano na tonalidade âmbar.",
        unit: "UN",
        priceCents: null,
        imageUrl: "/produtos/p4.jpg",
        imageUrls: ["/produtos/p4.jpg"],
        groupId: "g1a",
        inStock: true,
        isActive: true,
        salesCount: 60,
        createdAt: now,
      },
      {
        id: "p5",
        sku: "IG-005",
        name: "Bandeja Espelhada Retangular com Alça Dourada",
        brand: "Studio Home",
        description: "Bandeja decorativa espelhada com estrutura metálica e alças douradas.",
        unit: "UN",
        priceCents: 19450,
        imageUrl: "/produtos/p5.jpg",
        imageUrls: ["/produtos/p5.jpg"],
        groupId: "g1d",
        inStock: true,
        isActive: true,
        salesCount: 50,
        createdAt: now,
      },
      {
        id: "p6",
        sku: "IG-006",
        name: "Caixa Organizadora Revestida em Linho Off-White",
        brand: "Studio Home",
        description: "Caixa organizadora rígida revestida em tecido linho off-white com tampa.",
        unit: "CX",
        priceCents: 14200,
        imageUrl: "/produtos/p6.jpg",
        imageUrls: ["/produtos/p6.jpg"],
        groupId: "g1c",
        inStock: false,
        isActive: true,
        salesCount: 40,
        createdAt: now,
      },
      {
        id: "p7",
        sku: "IG-007",
        name: "Luminária de Mesa Cristal Acrílico Recarregável LED",
        brand: "Lumina",
        description: "Luminária sem fio recarregável via USB-C com 3 temperaturas de cor.",
        unit: "UN",
        priceCents: 31590,
        imageUrl: "/produtos/p7.jpg",
        imageUrls: ["/produtos/p7.jpg"],
        groupId: "g1e",
        inStock: true,
        isActive: true,
        salesCount: 30,
        createdAt: now,
      },
      {
        id: "p8",
        sku: "IG-008",
        name: "Conjunto Sousplat Dourado Metalizado 6 Peças",
        brand: "Mesa Nobre",
        description: "Kit com 6 sousplats redondos vazados com acabamento dourado.",
        unit: "CJ",
        priceCents: 21900,
        imageUrl: "/produtos/p8.jpg",
        imageUrls: ["/produtos/p8.jpg"],
        groupId: "g1g",
        inStock: true,
        isActive: true,
        salesCount: 20,
        createdAt: now,
      },
      {
        id: "p9",
        sku: "IG-009",
        name: "Rolo de Etiquetas Térmicas Adesivas 100x150mm",
        brand: "ProLabel",
        description: "Rolo com 500 etiquetas térmicas padrão expedição e logística.",
        unit: "RL",
        priceCents: 4890,
        imageUrl: "/produtos/p9.jpg",
        imageUrls: ["/produtos/p9.jpg"],
        groupId: "g3",
        inStock: true,
        isActive: true,
        salesCount: 10,
        createdAt: now,
      },
    ],
    customers: [
      {
        id: "ig-cust-1",
        code: 1,
        integrationCode: "101",
        personType: "PJ",
        document: "11222333000181",
        login: "11222333000181",
        sellerUsername: "admin",
        name: "BOUTIQUE CASA & ARTE DECORAÇÕES LTDA",
        tradeName: "CASA & ARTE HOME DESIGN",
        email: "compras@casaearte.com.br",
        phone: "(27) 99810-3723",
        address: "Av. Nossa Senhora da Penha, 500, Loja 04",
        neighborhood: "Praia do Canto",
        city: "Vitória - ES",
        cep: "29055-130",
        ibge: "3205309",
        contactName: " Mariana Costa (Compras)",
        countryCode: "1058",
        site: "https://igdecoracao.com.br",
        passwordHash: hashPassword("11222333000181"),
        passwordPlainHint: "11222333000181 (CNPJ)",
        discountPercent: 10,
        isActive: true,
        createdAt: now,
      },
      {
        id: "ig-cust-2",
        code: 2,
        integrationCode: "102",
        personType: "PJ",
        document: "45812390000172",
        login: "45812390000172",
        sellerUsername: "admin",
        name: "ATELIÊ DESIGN & INTERIORES VITÓRIA LTDA",
        tradeName: "ATELIÊ VITÓRIA",
        email: "contato@atelievitoria.com.br",
        phone: "(27) 99700-1122",
        address: "Rua Aleixo Netto, 1200, Sala 302",
        neighborhood: "Praia do Canto",
        city: "Vitória - ES",
        cep: "29055-260",
        ibge: "3205309",
        contactName: "Fernanda Ribeiro",
        countryCode: "1058",
        site: "",
        passwordHash: hashPassword("45812390000172"),
        passwordPlainHint: "45812390000172 (CNPJ)",
        discountPercent: 5,
        isActive: true,
        createdAt: now,
      },
    ],
    staffUsers: [
      {
        id: "stf-ig-admin",
        username: "admin",
        name: "Administrador IG",
        email: "admin@igdecoracao.com.br",
        passwordHash: passIgHash,
        passwordPlainHint: "ig@123",
        role: "owner",
        status: "active",
        createdAt: now,
      },
      {
        id: "stf-ig-adilson",
        username: "adilson",
        name: "Adilson (Vendedor FV)",
        email: "adilson@igdecoracao.com.br",
        passwordHash: pass5122Hash,
        passwordPlainHint: "5122",
        role: "seller",
        status: "active",
        createdAt: now,
      },
    ],
    paymentMethods: [
      { id: "pm-pix", name: "PIX (Aprovação Imediata)", kind: "pix", isActive: true },
      { id: "pm-bol", name: "Boleto Bancário 28 dias", kind: "boleto", isActive: true },
      { id: "pm-car", name: "Cartão de Crédito em até 6x", kind: "cartao", isActive: true },
      { id: "pm-fat", name: "Faturado B2B (Cadastro Aprovado)", kind: "faturado", isActive: true },
    ],
    orders: [
      {
        id: "ord-1001",
        code: "PED-1001",
        customerId: "cust-demo",
        customerName: "Cliente Demonstração",
        customerDocument: "11144477735",
        sellerId: "stf-ig-admin",
        sellerName: "Administrador IG (admin)",
        paymentMethodId: "pm-pix",
        paymentMethodName: "PIX (Aprovação Imediata)",
        status: "faturado",
        totalCents: 81196,
        hasConsultItems: false,
        notes: "Entregar em horário comercial.",
        items: [
          {
            id: "it-1",
            productId: "p1",
            productName: "CJ Seis Copos de Vidro Borossilicato Cupcake 400ml",
            unit: "UN",
            qty: 2,
            unitPriceCents: 28618,
            subtotalCents: 57236,
          },
          {
            id: "it-2",
            productId: "p3",
            productName: "Escultura de Metal e Cristal 20x8x18cm",
            unit: "UN",
            qty: 1,
            unitPriceCents: 23960,
            subtotalCents: 23960,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "ord-1002",
        code: "ORC-1002",
        customerId: "cust-b2b-1",
        customerName: "Boutique Casa & Arte Ltda",
        customerDocument: "11222333000181",
        paymentMethodId: "pm-fat",
        paymentMethodName: "Faturado B2B (Cadastro Aprovado)",
        status: "orcamento",
        totalCents: 38770,
        hasConsultItems: true,
        notes: "Solicito cotação para 2 unidades do Vaso Murano Âmbar.",
        items: [
          {
            id: "it-3",
            productId: "p4",
            productName: "Vaso Decorativo de Vidro Murano Âmbar",
            unit: "UN",
            qty: 2,
            unitPriceCents: null,
            subtotalCents: null,
          },
          {
            id: "it-4",
            productId: "p2",
            productName: "Mickey de Resina Incolor 19x10,5x28cm",
            unit: "UN",
            qty: 1,
            unitPriceCents: 38770,
            subtotalCents: 38770,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  // Banco 2: PRO-CONTROL (35951466000157_BDpdon) - pro-control / adilson / 5122
  const dbControlPdv: TenantDatabaseInstance = {
    dbName: "35951466000157_BDpdon",
    cnpj: "35951466000157",
    groups: [
      { id: "cp-g1", name: "Produto", parentId: null, sortOrder: 1, isActive: true },
      { id: "cp-g1a", name: "Informática", parentId: "cp-g1", sortOrder: 1, isActive: true },
      { id: "cp-g2", name: "Pro-control Serviços", parentId: null, sortOrder: 2, isActive: true },
      { id: "cp-g2a", name: "Serviços", parentId: "cp-g2", sortOrder: 1, isActive: true },
    ],
    products: [
      {
        id: "cp-p1",
        sku: "PDV-001",
        name: "ControllPDV - Sistema de Emissão de NFCe / NFe",
        brand: "Pro-Control",
        description: "Sistema completo de frente de loja para emissão de NFCe e NFe com controle de estoque e financeiro.",
        unit: "UN",
        priceCents: null,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g2a",
        inStock: true,
        isActive: true,
        salesCount: 120,
        createdAt: now,
      },
      {
        id: "cp-p2",
        sku: "INF-002",
        name: "Teclado Multimídia Sem Fio",
        brand: "LogiTech",
        description: "Teclado sem fio ABNT2 com teclas multimídia de atalho.",
        unit: "UN",
        priceCents: 3300,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 95,
        createdAt: now,
      },
      {
        id: "cp-p3",
        sku: "INF-003",
        name: "Conector RJ 45",
        brand: "DIV",
        description: "Conector RJ45 Cat5e/Cat6 com contatos banhados para crimpagem de cabo de rede.",
        unit: "UN",
        priceCents: 150,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 300,
        createdAt: now,
      },
      {
        id: "cp-p4",
        sku: "INF-004",
        name: "Microfone de Mesa Preto",
        brand: "DIV",
        description: "Microfone condensador de mesa com haste flexível e base estável.",
        unit: "UN",
        priceCents: 2500,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 40,
        createdAt: now,
      },
      {
        id: "cp-p5",
        sku: "INF-005",
        name: "Leitor Código de Barras",
        brand: "Elgin",
        description: "Leitor de código de barras USB laser de alta velocidade para PDV.",
        unit: "CX",
        priceCents: 17070,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 85,
        createdAt: now,
      },
      {
        id: "cp-p6",
        sku: "INF-006",
        name: "Caixa de Som USB Preto",
        brand: "Multilaser",
        description: "Par de caixas de som estéreo alimentadas via USB com controle de volume.",
        unit: "UN",
        priceCents: 8470,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 55,
        createdAt: now,
      },
      {
        id: "cp-p7",
        sku: "INF-007",
        name: "Computador Intel Core2 Duo E7500 2.93 GHz 2GB RAM",
        brand: "Pro-Control PC",
        description: "Desktop homologado para frente de caixa PDV.",
        unit: "PC",
        priceCents: 135280,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 18,
        createdAt: now,
      },
      {
        id: "cp-p8",
        sku: "INF-008",
        name: "Mouse Óptico Sem Fio",
        brand: "DIV",
        description: "Mouse óptico ergonômico 1600 DPI com receptor nano USB.",
        unit: "UN",
        priceCents: 3250,
        imageUrl: null,
        imageUrls: [],
        groupId: "cp-g1a",
        inStock: true,
        isActive: true,
        salesCount: 110,
        createdAt: now,
      },
    ],
    customers: [
      {
        id: "cp-cust-elifas",
        code: 2,
        integrationCode: "2",
        personType: "PF",
        document: "14182306775",
        rgOrIe: "3179140",
        login: "14182306775",
        sellerUsername: "adilson",
        name: "Elifas de Oliveira",
        email: "elifas@pro-controll.com.br",
        phone: "27 99999-0000",
        addresses: [
          {
            id: "addr-elifas-1",
            type: "Principal",
            cep: "29177-185",
            street: "Rua agapanto",
            number: "192",
            complement: "casa",
            neighborhood: "cascata",
            city: "Serra",
            uf: "ES",
            ibge: "12345",
          },
        ],
        contacts: [],
        address: "Rua agapanto, 192 - casa",
        neighborhood: "cascata",
        city: "Serra - ES",
        cep: "29177-185",
        ibge: "12345",
        contactName: "Elifas de Oliveira",
        countryCode: "1058",
        site: "",
        passwordHash: hashPassword("14182306775"),
        passwordPlainHint: "14182306775 (CPF)",
        discountPercent: 0,
        isActive: true,
        createdAt: now,
      },
      {
        id: "cp-cust-procontrol",
        code: 1,
        integrationCode: "234",
        personType: "PJ",
        document: "35951466000157",
        login: "35951466000157",
        sellerUsername: "adilson",
        name: "PRO CONTROL - CONTROLES INFORMATIZADOS LTDA",
        tradeName: "PRO-CONTROLL SISTEMAS E TECNOLOGIA",
        email: "adilsonr43@gmail.com",
        phone: "27 33395857",
        address: "Avenida Jerônimo Monteiro, 1690, Loja 68-70",
        neighborhood: "Centro de Vila Velha",
        city: "Vila Velha - ES",
        cep: "29100-400",
        ibge: "3205200",
        contactName: "Adilson Rodrigues",
        countryCode: "1058",
        site: "https://pro-controll.com.br",
        passwordHash: hashPassword("35951466000157"),
        passwordPlainHint: "35951466000157 (CNPJ)",
        discountPercent: 0,
        isActive: true,
        createdAt: now,
      },
    ],
    staffUsers: [
      {
        id: "stf-cp-adilson",
        username: "adilson",
        name: "Adilson (Vendedor Pro-Control)",
        email: "adilson@procontrol.com.br",
        passwordHash: pass5122Hash,
        passwordPlainHint: "5122",
        role: "seller",
        status: "active",
        createdAt: now,
      },
      {
        id: "stf-cp-admin",
        username: "admin",
        name: "Admin Pro-Control",
        email: "procontroladm@terra.com.br",
        passwordHash: pass5122Hash,
        passwordPlainHint: "5122",
        role: "owner",
        status: "active",
        createdAt: now,
      },
    ],
    paymentMethods: [
      { id: "cp-pm-1", name: "PIX", kind: "pix", isActive: true },
      { id: "cp-pm-2", name: "Boleto 15 dias", kind: "boleto", isActive: true },
      { id: "cp-pm-3", name: "Cartão de Crédito", kind: "cartao", isActive: true },
      { id: "cp-pm-4", name: "Faturado S2000PLUS (28 dias)", kind: "faturado", isActive: true },
    ],
    orders: [],
  };

  // Banco 3: COMPUTIVA (03358951000198_BDpdon) - Mesma empresa S2000PLUS <-> FV
  const dbComputiva: TenantDatabaseInstance = {
    dbName: "03358951000198_BDpdon",
    cnpj: "03358951000198",
    groups: [
      { id: "cm-g1", name: "Automação & PDV", parentId: null, sortOrder: 1, isActive: true },
      { id: "cm-g1a", name: "Impressoras & Leitores", parentId: "cm-g1", sortOrder: 1, isActive: true },
      { id: "cm-g1b", name: "Computadores & Terminais", parentId: "cm-g1", sortOrder: 2, isActive: true },
      { id: "cm-g2", name: "Sistemas S2000PLUS", parentId: null, sortOrder: 2, isActive: true },
      { id: "cm-g2a", name: "Licenças & Módulos FV", parentId: "cm-g2", sortOrder: 1, isActive: true },
    ],
    products: [
      {
        id: "cm-p1",
        sku: "S2000-ERP",
        name: "Licença S2000PLUS ERP + Módulo Força de Vendas Integrado",
        brand: "Pro-Control / Computiva",
        description: "Licença mensal do sistema de retaguarda S2000PLUS integrado ao Força de Vendas (FV) por CNPJ.",
        unit: "UN",
        priceCents: 29900,
        imageUrl: null,
        imageUrls: [],
        groupId: "cm-g2a",
        inStock: true,
        isActive: true,
        salesCount: 150,
        createdAt: now,
      },
      {
        id: "cm-p2",
        sku: "AUT-010",
        name: "Impressora Térmica Não Fiscal Elgin i9 USB/Ethernet",
        brand: "Elgin",
        description: "Impressora térmica de alta velocidade com guilhotina automática para NFC-e.",
        unit: "UN",
        priceCents: 78900,
        imageUrl: null,
        imageUrls: [],
        groupId: "cm-g1a",
        inStock: true,
        isActive: true,
        salesCount: 92,
        createdAt: now,
      },
      {
        id: "cm-p3",
        sku: "AUT-011",
        name: "Leitor Código de Barras 2D QR Code USB",
        brand: "Elgin",
        description: "Leitor de código de barras 1D/2D e QR Code PIX para frente de caixa.",
        unit: "UN",
        priceCents: 24500,
        imageUrl: null,
        imageUrls: [],
        groupId: "cm-g1a",
        inStock: true,
        isActive: true,
        salesCount: 74,
        createdAt: now,
      },
      {
        id: "cm-p4",
        sku: "AUT-012",
        name: "Terminal Ponto de Venda Mini PC SSD 240GB 8GB RAM",
        brand: "Computiva PC",
        description: "Mini PC compacto homologado para S2000PLUS e frente de caixa.",
        unit: "PC",
        priceCents: 169000,
        imageUrl: null,
        imageUrls: [],
        groupId: "cm-g1b",
        inStock: true,
        isActive: true,
        salesCount: 45,
        createdAt: now,
      },
      {
        id: "cm-p5",
        sku: "AUT-013",
        name: "Implantação e Treinamento Presencial S2000PLUS",
        brand: "Computiva",
        description: "Serviço especializado de parametrização fiscal e treinamento da equipe.",
        unit: "UN",
        priceCents: null,
        imageUrl: null,
        imageUrls: [],
        groupId: "cm-g2a",
        inStock: true,
        isActive: true,
        salesCount: 30,
        createdAt: now,
      },
    ],
    customers: [
      {
        id: "cm-cust-1",
        code: 1,
        integrationCode: "501",
        personType: "PJ",
        document: "03358951000198",
        login: "03358951000198",
        sellerUsername: "adilson",
        name: "COMPUTIVA TECNOLOGIA E SISTEMAS LTDA",
        tradeName: "COMPUTIVA S2000PLUS",
        email: "comercial@computiva.com.br",
        phone: "(27) 3200-5122",
        address: "Av. Champagnat, 950, Sala 402",
        neighborhood: "Praia da Costa",
        city: "Vila Velha - ES",
        cep: "29101-410",
        ibge: "3205200",
        contactName: "Carlos Eduardo (TI Computiva)",
        countryCode: "1058",
        site: "https://computiva.com.br",
        passwordHash: hashPassword("03358951000198"),
        passwordPlainHint: "03358951000198 (CNPJ)",
        discountPercent: 10,
        isActive: true,
        createdAt: now,
      },
      {
        id: "cm-cust-2",
        code: 2,
        integrationCode: "502",
        personType: "PJ",
        document: "27451890000144",
        login: "27451890000144",
        sellerUsername: "adilson",
        name: "SUPERMERCADO ATLÂNTICO VILA VELHA LTDA",
        tradeName: "SUPERMERCADO ATLÂNTICO",
        email: "financeiro@superatlantico.com.br",
        phone: "(27) 3340-8899",
        address: "Rodovia do Sol, 2100",
        neighborhood: "Itaparica",
        city: "Vila Velha - ES",
        cep: "29102-020",
        ibge: "3205200",
        contactName: "Roberto Almeida",
        countryCode: "1058",
        site: "",
        passwordHash: hashPassword("27451890000144"),
        passwordPlainHint: "27451890000144 (CNPJ)",
        discountPercent: 5,
        isActive: true,
        createdAt: now,
      },
    ],
    staffUsers: [
      {
        id: "stf-cm-adilson",
        username: "adilson",
        name: "Adilson (Vendedor FV)",
        email: "adilson@computiva.com.br",
        passwordHash: pass5122Hash,
        passwordPlainHint: "5122",
        role: "seller",
        status: "active",
        createdAt: now,
      },
      {
        id: "stf-cm-admin",
        username: "admin",
        name: "Administrador Computiva",
        email: "admin@computiva.com.br",
        passwordHash: pass5122Hash,
        passwordPlainHint: "5122",
        role: "owner",
        status: "active",
        createdAt: now,
      },
    ],
    paymentMethods: [
      { id: "cm-pm-1", name: "PIX Empresarial", kind: "pix", isActive: true },
      { id: "cm-pm-2", name: "Boleto S2000PLUS 28 dias", kind: "boleto", isActive: true },
      { id: "cm-pm-3", name: "Faturado Contrato", kind: "faturado", isActive: true },
    ],
    orders: [],
  };

  // Banco 4: Alfa Distribuidora Matriz (00000000000191_BDpdon)
  const dbAlfa: TenantDatabaseInstance = {
    dbName: "00000000000191_BDpdon",
    cnpj: "00000000000191",
    groups: [
      { id: "al-g1", name: "Embalagens & Suprimentos", parentId: null, sortOrder: 1, isActive: true },
      { id: "al-g2", name: "Material de Escritório", parentId: null, sortOrder: 2, isActive: true },
    ],
    products: [
      {
        id: "al-p1",
        sku: "ALF-100",
        name: "Bobina Térmica PDV 80x40m Caixa c/ 30 rolos",
        brand: "AlfaPaper",
        description: "Caixa fechada com 30 bobinas térmicas 80mm x 40m para impressora de cupom.",
        unit: "CX",
        priceCents: 18990,
        imageUrl: "/produtos/p9.jpg",
        imageUrls: ["/produtos/p9.jpg"],
        groupId: "al-g1",
        inStock: true,
        isActive: true,
        salesCount: 65,
        createdAt: now,
      },
    ],
    customers: [
      {
        id: "al-cust-1",
        document: "11144477735",
        login: "11144477735",
        name: "Cliente Demonstração",
        email: "cliente@exemplo.com.br",
        phone: "(11) 99999-0000",
        passwordHash: demoPassHash,
        passwordPlainHint: "demo123 ou CPF",
        discountPercent: 5,
        isActive: true,
        createdAt: now,
      },
    ],
    staffUsers: [
      {
        id: "stf-al-adilson",
        username: "adilson",
        name: "Adilson (Vendedor)",
        email: "adilson@alfadistribuidora.com.br",
        passwordHash: pass5122Hash,
        passwordPlainHint: "5122",
        role: "seller",
        status: "active",
        createdAt: now,
      },
    ],
    paymentMethods: [
      { id: "al-pm-1", name: "PIX Atacado", kind: "pix", isActive: true },
      { id: "al-pm-2", name: "Boleto Faturado 30/60 dias", kind: "faturado", isActive: true },
    ],
    orders: [],
  };

  return {
    version: 5,
    routes,
    databases: {
      "35951466000157": dbControlPdv,
      "03358951000198": dbComputiva,
      "11222333000181": dbIg,
      "00000000000191": dbAlfa,
    },
  };
}

let inMemoryPlatformData: PlatformDataFile | null = null;

export function readPlatformData(): PlatformDataFile {
  if (inMemoryPlatformData) {
    return inMemoryPlatformData;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw) as PlatformDataFile;
      if (parsed && parsed.version === 5 && Array.isArray(parsed.routes) && parsed.databases) {
        inMemoryPlatformData = parsed;
        return parsed;
      }
    }
  } catch {
    // Recria se corrompido ou versão anterior
  }
  const seed = createInitialSeed();
  inMemoryPlatformData = seed;
  writePlatformData(seed);
  return seed;
}

export function writePlatformData(data: PlatformDataFile): void {
  inMemoryPlatformData = data;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignora falha de escrita em filesystem read-only
  }
}

/**
 * Resolve uma empresa pelo CNPJ (ex.: 35951466000157, 03358951000198)
 * OU pelo código/slug do Força de Vendas (ex.: pro-control, computiva, ig_fv).
 */
export function getTenantRouteByCnpj(rawIdentifier: string): TenantRouteRecord | null {
  const clean = (rawIdentifier ?? "").trim().toLowerCase();
  if (!clean) return null;
  const digits = onlyDigits(clean);
  const data = readPlatformData();
  return (
    data.routes.find(
      (r) =>
        (digits.length === 14 && r.cnpj === digits) ||
        r.slug.toLowerCase() === clean ||
        (r.companyCode && r.companyCode.toLowerCase() === clean)
    ) ?? null
  );
}

export function getTenantRouteById(tenantId: string): TenantRouteRecord | null {
  const data = readPlatformData();
  return data.routes.find((r) => r.tenantId === tenantId) ?? null;
}

export function getTenantDatabase(rawCnpj: string): TenantDatabaseInstance | null {
  const cnpj = onlyDigits(rawCnpj);
  const data = readPlatformData();
  return data.databases[cnpj] ?? null;
}

export function mutateTenantDatabase<T>(
  rawCnpj: string,
  mutator: (db: TenantDatabaseInstance, route: TenantRouteRecord, all: PlatformDataFile) => T
): T {
  const cnpj = onlyDigits(rawCnpj);
  const data = readPlatformData();
  const route = data.routes.find((r) => r.cnpj === cnpj);
  const db = data.databases[cnpj];
  if (!route || !db) {
    throw new Error(`Banco da empresa CNPJ ${cnpj} não encontrado.`);
  }
  const result = mutator(db, route, data);
  route.updatedAt = new Date().toISOString();
  writePlatformData(data);
  return result;
}

