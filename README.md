# FV Plataforma Comercial SaaS Multiempresa (Multi-Tenant)

Plataforma de gestão comercial integrada com loja virtual desenvolvida sobre **Next.js (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **shadcn/ui** e **Supabase (PostgreSQL, Auth e Storage)**.

---

## 1. Visão Geral da Fase 1 (Fundação SaaS)

A Fase 1 estabelece as fundações inegociáveis de segurança e arquitetura do produto:
- **Isolamento de Dados Estrito (Multi-tenant):** Toda tabela de dados de tenant possui `tenant_id NOT NULL` e políticas Row Level Security (RLS) cobrindo `SELECT`, `INSERT`, `UPDATE` e `DELETE`.
- **Proteção de Segredos:** A chave administrativa `service_role` **nunca** é exposta no navegador. Operações privilegiadas acontecem apenas no servidor em rotas internas.
- **Resolução de Empresa Ativa:** A identificação do tenant ativo é resolvida exclusivamente no servidor e validada contra os vínculos de membro do usuário logado (`tenant_users`).
- **Trilha de Auditoria Imutável:** Registro seguro de operações sensíveis em `audit_logs` (autor, tenant, data/hora, entidade, payload anterior e novo).
- **Tema Dinâmico por Tenant:** Variáveis CSS do shadcn/ui armazenadas em `store_settings` e injetadas por empresa. Cor primária padrão: `#44C5ED`, com texto escuro sobre ela `#0F172A` para contraste acessível.
- **PWA Básico:** Suporte a PWA com `manifest.json` e Service Worker (`sw.js`) para instalação e cache de assets estáticos (sem suporte a vendas offline, conforme regras).
- **Observabilidade:** Configuração para **Sentry** e separação em três ambientes (`development`, `staging`, `production`).

---

## 2. Estrutura do Projeto

```text
├── .env.example                          # Modelo de variáveis de ambiente sem segredos
├── next.config.mjs                       # Configuração do Next.js
├── tailwind.config.ts                    # Tokens de design e mapeamento shadcn/ui
├── tsconfig.json                         # Configuração estrita do TypeScript
├── public/
│   ├── manifest.json                     # Manifesto PWA
│   └── sw.js                             # Service worker básico
├── supabase/
│   └── migrations/
│       ├── 20261104000001_initial_schema.sql         # Tenants, perfis, RBAC (roles/permissions)
│       ├── 20261104000002_plans_and_subscriptions.sql # Planos e assinaturas SaaS
│       ├── 20261104000003_store_settings_and_audit.sql# Identidade visual e trilha de auditoria
│       └── 20261104000004_rls_policies.sql            # Políticas RLS e funções de segurança
├── tests/
│   ├── db/
│   │   ├── rls-tenant-isolation.test.ts  # Testes Vitest de isolamento multiempresa
│   │   └── rls-node-runner.test.mjs      # Runner nativo Node.js com asserções estritas
│   └── unit/
│       ├── theme-colors.test.ts          # Teste de conversão e contraste HSL
│       └── theme-colors-runner.test.mjs  # Runner nativo Node.js para temas
└── src/
    ├── app/
    │   ├── (auth)/                       # Telas de login, recuperação e redefinição de senha
    │   ├── (admin)/                      # Painel de gestão com Sidebar, Topbar e módulos
    │   ├── api/auth/callback/route.ts    # Callback OAuth / PKCE Supabase
    │   ├── globals.css                   # Variáveis e utilitários Tailwind/shadcn
    │   └── layout.tsx                    # Root Layout com registro PWA
    ├── components/
    │   ├── admin/                        # Sidebar, Topbar, AdminShell, TenantSwitcher e ThemeProvider
    │   └── ui/                           # Primitivos shadcn/ui (Button, Input, Card)
    ├── lib/
    │   ├── supabase/                     # Clientes browser, server, admin e middleware
    │   ├── audit/                        # Logger de auditoria imutável
    │   └── utils.ts                      # Utilitários de classes CSS
    └── modules/
        ├── auth/                         # Server actions de autenticação
        ├── tenants/                      # Resolução segura do tenant ativo
        └── store-settings/               # Engine de cores e configurações da loja
```

---

## 3. Instruções de Setup Local

### Pré-requisitos
- **Node.js**: v20+ ou v22+
- **Supabase CLI** ou instância Supabase (local ou na nuvem)

### 1. Clonar e Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```
Preencha com as credenciais do seu projeto Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (apenas para scripts de migração/seed do servidor)
- `NEXT_PUBLIC_APP_URL` (ex: `http://localhost:3000`)
- `NEXT_PUBLIC_SENTRY_DSN` (opcional em desenvolvimento)

### 3. Aplicar as Migrações do Banco
As migrações SQL aplicam do zero em banco limpo:
```bash
npx supabase db push
# ou execute os arquivos SQL da pasta supabase/migrations na ordem:
# 1. 20261104000001_initial_schema.sql
# 2. 20261104000002_plans_and_subscriptions.sql
# 3. 20261104000003_store_settings_and_audit.sql
# 4. 20261104000004_rls_policies.sql
```

### 4. Executar os Testes Automatizados de Isolamento
Execute a suíte de testes de isolamento multi-tenant e RLS:
```bash
# Execução direta via Node.js nativo:
node --test tests/db/rls-node-runner.test.mjs
node --test tests/unit/theme-colors-runner.test.mjs

# Ou via Vitest (após npm install):
npm test
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000`.

---

## 4. O Que Foi Entregue Nesta Fase

1. **Fundação e Toolchain:**
   - Next.js 15 App Router configurado com TypeScript estrito, Tailwind CSS e shadcn/ui.
   - `.env.example` documentado sem vazamento de segredos.
2. **Camada de Banco e RLS:**
   - Tabelas criadas: `tenants`, `profiles`, `roles`, `permissions`, `role_permissions`, `tenant_users`, `plans`, `subscriptions`, `store_settings`, `audit_logs`.
   - RLS ativa em todas as tabelas cobrindo `SELECT`, `INSERT`, `UPDATE` e `DELETE`.
   - Separação justificada da tabela global `plans` (apenas leitura pelo cliente).
3. **Segurança de Autenticação e Sessão:**
   - Supabase Auth com login, logout, solicitação de recuperação de senha e redefinição de senha.
   - Middleware de sessão (`src/middleware.ts`) que protege todas as rotas internas e redireciona usuários não autenticados.
   - Cliente administrativo (`createAdminClient`) confinado exclusivamente ao servidor (`src/lib/supabase/admin.ts`).
4. **Resolução de Empresa Ativa (Server-side):**
   - Resolução e alternância em `src/modules/tenants/resolver.ts` e `actions.ts`. Cookie seguro `httpOnly` verificado no banco contra os vínculos ativos do usuário.
5. **Trilha de Auditoria:**
   - Módulo `src/lib/audit/logger.ts` para operações sensíveis, gravando em `audit_logs` imutável.
6. **Interface do Painel e Sistema de Cores:**
   - Layout com **Sidebar responsiva** (com os 10 módulos: Painel, Clientes, Produtos, Orçamentos, Pedidos, Vendas, Loja virtual, Relatórios, Assinatura, Configurações).
   - **Topbar** com componente `TenantSwitcher` e perfil/logout.
   - `TenantThemeProvider` dinâmico aplicando as cores da tabela `store_settings` (`#44C5ED` primária com texto escuro `#0F172A`).
7. **PWA Básico:**
   - `manifest.json` com configurações para mobile e `sw.js` com cache de assets estáticos (sem suporte a vendas offline).
8. **Ambientes e Sentry:**
   - Módulo `src/config/sentry.ts` para observabilidade e rastreabilidade de erros nos ambientes de desenvolvimento, homologação e produção.
9. **Suíte de Testes Automatizados de Isolamento:**
   - Testes comprovando que Tenant A não acessa dados do Tenant B, tentativas de spoofing de `tenant_id` falham por RLS, e chamadas sem papel administrativo são barradas.

---

## 5. Decisões Tomadas e Pendências de Confirmação

- **Decisão Pendente Registrada:** Suposição de que um usuário (`profiles`) pode pertencer a mais de uma empresa (`tenant_users`). A interface já conta com o alternador de empresa (`TenantSwitcher`). Caso o modelo de negócios exija futuramente que cada e-mail pertença estritamente a um único tenant, basta adicionar uma restrição `UNIQUE(user_id)` em `tenant_users`.
- **Totais Comerciais:** As tabelas e módulos comerciais futuros já foram desenhados para que cálculos de orçamentos, pedidos e vendas sejam executados 100% no servidor.

#   f o r c a V e n d a s  
 