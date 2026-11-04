"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, X, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { ACCESS_LEVEL_MODULES } from "@/lib/tenant-store/constants";
import type {
  DbAccessLevel,
  DbAccessLevelPermission,
  DbStaffUser,
} from "@/lib/tenant-store";
import {
  createStaffUserAction,
  deleteAccessLevelAction,
  deleteStaffUserAction,
  saveAccessLevelAction,
} from "@/modules/admin/actions";

interface Props {
  tenantName: string;
  dbName: string;
  accessLevels: DbAccessLevel[];
  staffUsers: DbStaffUser[];
}

function createEmptyPermissions(): DbAccessLevelPermission[] {
  return ACCESS_LEVEL_MODULES.map((m) => ({
    moduleKey: m.key,
    moduleLabel: m.label,
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canReport: false,
  }));
}

function normalizePermissions(
  existing?: DbAccessLevelPermission[]
): DbAccessLevelPermission[] {
  const map = new Map((existing ?? []).map((p) => [p.moduleKey, p]));
  return ACCESS_LEVEL_MODULES.map((m) => {
    const found = map.get(m.key);
    return {
      moduleKey: m.key,
      moduleLabel: m.label,
      canView: Boolean(found?.canView),
      canCreate: Boolean(found?.canCreate),
      canUpdate: Boolean(found?.canUpdate),
      canDelete: Boolean(found?.canDelete),
      canReport: Boolean(found?.canReport),
    };
  });
}

export function AccessLevelsAndUsersManager({
  tenantName,
  dbName,
  accessLevels,
  staffUsers,
}: Props) {
  const sortedLevels = [...accessLevels].sort((a, b) => a.code - b.code);
  const nextLevelCode =
    1 + sortedLevels.reduce((max, l) => Math.max(max, l.code), 0);

  // Modo da tela de Nível de Acesso: "list" (Print 1) | "insert" (Print 2) | "edit" (Print 3) | "view"
  const [levelMode, setLevelMode] = useState<
    "list" | "insert" | "edit" | "view"
  >("list");
  const [editingLevelId, setEditingLevelId] = useState<string>("");
  const [levelCode, setLevelCode] = useState<number>(nextLevelCode);
  const [levelName, setLevelName] = useState<string>("");
  const [permissions, setPermissions] = useState<DbAccessLevelPermission[]>(
    createEmptyPermissions()
  );

  // Estado do formulário de Usuário (vinculado aos Níveis de Acesso)
  const [editingUserId, setEditingUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userLogin, setUserLogin] = useState<string>("");
  const [userPassword, setUserPassword] = useState<string>("5122");
  const [userEmail, setUserEmail] = useState<string>("");
  const [selectedAccessLevelId, setSelectedAccessLevelId] = useState<string>(
    sortedLevels.find((l) => l.code === 2)?.id || sortedLevels[0]?.id || "lvl-2"
  );

  const [successModalMsg, setSuccessModalMsg] = useState<string | null>(null);

  // Abre modo Inserir Nível de Acesso (Fiel ao Print 2)
  const handleOpenInsertLevel = () => {
    setEditingLevelId("");
    setLevelCode(nextLevelCode);
    setLevelName("");
    setPermissions(createEmptyPermissions());
    setLevelMode("insert");
  };

  // Abre modo Editar ou Visualizar Nível de Acesso (Fiel ao Print 3)
  const handleOpenLevel = (lvl: DbAccessLevel, mode: "edit" | "view") => {
    setEditingLevelId(lvl.id);
    setLevelCode(lvl.code);
    setLevelName(lvl.name);
    setPermissions(normalizePermissions(lvl.permissions));
    setLevelMode(mode);
  };

  const handleClearPermissions = () => {
    setLevelName("");
    setPermissions(createEmptyPermissions());
  };

  const togglePermissionCell = (
    moduleKey: string,
    field: "canView" | "canCreate" | "canUpdate" | "canDelete" | "canReport"
  ) => {
    if (levelMode === "view") return;
    setPermissions((prev) =>
      prev.map((row) =>
        row.moduleKey === moduleKey ? { ...row, [field]: !row[field] } : row
      )
    );
  };

  const isRowTotalChecked = (row: DbAccessLevelPermission) =>
    row.canView &&
    row.canCreate &&
    row.canUpdate &&
    row.canDelete &&
    row.canReport;

  const toggleRowTotal = (moduleKey: string) => {
    if (levelMode === "view") return;
    setPermissions((prev) =>
      prev.map((row) => {
        if (row.moduleKey !== moduleKey) return row;
        const nextVal = !isRowTotalChecked(row);
        return {
          ...row,
          canView: nextVal,
          canCreate: nextVal,
          canUpdate: nextVal,
          canDelete: nextVal,
          canReport: nextVal,
        };
      })
    );
  };

  const handleLoadUserForEdit = (u: DbStaffUser) => {
    setEditingUserId(u.id);
    setUserName(u.name);
    setUserLogin(u.username || u.email.split("@")[0]);
    setUserPassword(u.passwordPlainHint || "5122");
    setUserEmail(u.email);
    const matchedLvl =
      sortedLevels.find((l) => l.id === u.accessLevelId) ||
      (u.role === "owner"
        ? sortedLevels.find((l) => l.code === 1)
        : u.role === "admin"
        ? sortedLevels.find((l) => l.code === 3)
        : sortedLevels.find((l) => l.code === 2));
    if (matchedLvl) setSelectedAccessLevelId(matchedLvl.id);
  };

  const handleResetUserForm = () => {
    setEditingUserId("");
    setUserName("");
    setUserLogin("");
    setUserPassword("5122");
    setUserEmail("");
  };

  const selectedLevelObj = sortedLevels.find(
    (l) => l.id === selectedAccessLevelId
  );

  return (
    <div className="space-y-8">
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

      {/* =====================================================================
          SEÇÃO 1: Início | Administrar | Cadastros | Nivelacesso (Prints 1, 2 e 3)
         ===================================================================== */}
      <div className="space-y-4">
        {/* Barra de Caminho: Início | Administrar | Cadastros | Nivelacesso */}
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
            <span className="font-extrabold text-foreground">Nivelacesso</span>
          </div>

          <span className="font-mono text-xs text-muted-foreground">
            {tenantName} • {dbName}
          </span>
        </div>

        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          {levelMode === "list" ? (
            /* MODO LISTAGEM DE NÍVEIS DE ACESSO (Fiel ao Print 1) */
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenInsertLevel}
                  className="inline-flex h-9 items-center justify-center rounded bg-[#8CC63F] px-5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#7cb332]"
                >
                  Inserir
                </button>

                <Link
                  href="/reports"
                  className="inline-flex h-9 items-center justify-center rounded bg-[#3FA9D6] px-5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#3196c2]"
                >
                  Relatórios
                </Link>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                      <th className="w-20 border-r border-white px-3 py-2.5 text-center font-extrabold">
                        Código
                      </th>
                      <th className="border-r border-white px-3 py-2.5 font-extrabold">
                        Descrição
                      </th>
                      <th className="w-32 px-3 py-2.5 text-center font-extrabold">
                        Opções
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLevels.map((lvl) => {
                      const isProtected = lvl.isProtected || lvl.code === 1;
                      return (
                        <tr
                          key={lvl.id}
                          className="border-b border-white bg-[#EFEFEF] text-slate-900 hover:bg-slate-200/70"
                        >
                          <td className="border-r border-white px-3 py-2.5 text-center font-medium">
                            {lvl.code}
                          </td>
                          <td className="border-r border-white px-3 py-2.5 font-medium">
                            {lvl.name}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              {/* Botão [👁️] Visualizar */}
                              <button
                                type="button"
                                onClick={() => handleOpenLevel(lvl, "view")}
                                title="Visualizar permissões do nível"
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8FA8B2] text-white hover:opacity-90"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Botão [✏️] Editar (desabilitado/cinza no Código 1 Administrador, fiel ao Print 1) */}
                              {isProtected ? (
                                <span
                                  title="Nível Administrador padrão (protegido)"
                                  className="inline-flex h-6 w-6 cursor-not-allowed items-center justify-center rounded bg-[#CCCCCC] text-white"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenLevel(lvl, "edit")}
                                  title="Editar nível de acesso"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white hover:opacity-90"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Botão [X] Excluir (desabilitado/cinza no Código 1 Administrador, fiel ao Print 1) */}
                              {isProtected ? (
                                <span
                                  title="Nível Administrador padrão (protegido)"
                                  className="inline-flex h-6 w-6 cursor-not-allowed items-center justify-center rounded bg-[#CCCCCC] text-white"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <form
                                  action={async (fd) => {
                                    await deleteAccessLevelAction(fd);
                                  }}
                                  className="inline"
                                >
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={lvl.id}
                                  />
                                  <button
                                    type="submit"
                                    title="Excluir nível de acesso"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#C00000] text-white hover:opacity-90"
                                  >
                                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* MODO INSERIR / EDITAR / VISUALIZAR MATRIZ DE NÍVEL DE ACESSO (Fiel aos Prints 2 e 3) */
            <form
              action={async (fd) => {
                await saveAccessLevelAction(fd);
                setSuccessModalMsg("O Nível de Acesso foi salvo com sucesso!");
                setLevelMode("list");
              }}
              className="space-y-5 text-xs"
            >
              <input type="hidden" name="id" value={editingLevelId} />
              <input type="hidden" name="code" value={String(levelCode)} />
              <input
                type="hidden"
                name="permissionsJson"
                value={JSON.stringify(permissions)}
              />

              {/* Linha Superior: Código + Nome do Nível */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 font-semibold">
                  <span>Código:</span>
                  <input
                    type="text"
                    readOnly
                    value={levelCode}
                    className={`h-9 w-16 rounded border border-slate-300 bg-background px-2.5 text-sm font-bold ${
                      levelMode !== "insert"
                        ? "text-red-600"
                        : "text-foreground"
                    }`}
                  />
                </label>

                <label className="flex min-w-[260px] flex-1 items-center gap-2 font-semibold">
                  <span className="shrink-0">Nome do Nível:</span>
                  <input
                    type="text"
                    name="name"
                    required
                    readOnly={levelMode === "view"}
                    value={levelName}
                    onChange={(e) => setLevelName(e.target.value)}
                    placeholder="Ex.: ACESSO CAIXA, Vendedor Externo, Gerente..."
                    className="h-9 w-full max-w-xl rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                  />
                </label>
              </div>

              {/* Tabela de Permissões: TIPO DE ACESSO | Consultar | Incluir | Alterar | Excluir | Relatório | Total */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                      <th className="border-r border-white px-3 py-2.5 text-left font-extrabold uppercase">
                        TIPO DE ACESSO
                      </th>
                      <th className="w-28 border-r border-white px-2 py-2.5 text-center font-extrabold">
                        Consultar
                      </th>
                      <th className="w-28 border-r border-white px-2 py-2.5 text-center font-extrabold">
                        Incluir
                      </th>
                      <th className="w-28 border-r border-white px-2 py-2.5 text-center font-extrabold">
                        Alterar
                      </th>
                      <th className="w-28 border-r border-white px-2 py-2.5 text-center font-extrabold">
                        Excluir
                      </th>
                      <th className="w-28 border-r border-white px-2 py-2.5 text-center font-extrabold">
                        Relatório
                      </th>
                      <th className="w-28 px-2 py-2.5 text-center font-extrabold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((row) => {
                      const allChecked = isRowTotalChecked(row);
                      return (
                        <tr
                          key={row.moduleKey}
                          className="border-b border-white bg-[#EFEFEF] text-slate-900 hover:bg-slate-200/60"
                        >
                          <td className="border-r border-white px-3 py-2 font-medium">
                            {row.moduleLabel}
                          </td>
                          <td className="border-r border-white px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canView}
                              disabled={levelMode === "view"}
                              onChange={() =>
                                togglePermissionCell(row.moduleKey, "canView")
                              }
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                          </td>
                          <td className="border-r border-white px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canCreate}
                              disabled={levelMode === "view"}
                              onChange={() =>
                                togglePermissionCell(row.moduleKey, "canCreate")
                              }
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                          </td>
                          <td className="border-r border-white px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canUpdate}
                              disabled={levelMode === "view"}
                              onChange={() =>
                                togglePermissionCell(row.moduleKey, "canUpdate")
                              }
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                          </td>
                          <td className="border-r border-white px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canDelete}
                              disabled={levelMode === "view"}
                              onChange={() =>
                                togglePermissionCell(row.moduleKey, "canDelete")
                              }
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                          </td>
                          <td className="border-r border-white px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.canReport}
                              disabled={levelMode === "view"}
                              onChange={() =>
                                togglePermissionCell(row.moduleKey, "canReport")
                              }
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              disabled={levelMode === "view"}
                              onChange={() => toggleRowTotal(row.moduleKey)}
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botões inferiores: Salvar | Limpar (no modo Inserir) | Cancelar (Prints 2 e 3) */}
              <div className="flex items-center justify-end gap-2 pt-6">
                {levelMode !== "view" && (
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
                  >
                    Salvar
                  </button>
                )}

                {levelMode === "insert" && (
                  <button
                    type="button"
                    onClick={handleClearPermissions}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
                  >
                    Limpar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setLevelMode("list")}
                  className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-5 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-200"
                >
                  {levelMode === "view" ? "Voltar" : "Cancelar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* =====================================================================
          SEÇÃO 2: Início | Administrar | Cadastros | Usuário (Vinculado ao Nível de Acesso)
         ===================================================================== */}
      <div className="space-y-4">
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
            <span className="font-extrabold text-foreground">Usuário</span>
          </div>

          <span className="text-xs text-muted-foreground">
            Cada usuário criado recebe um <b>Nível de Acesso</b> cadastrado acima
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Formulário de Criação / Edição de Usuário com escolha do Nível de Acesso */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="flex items-center gap-2 border-b pb-2.5 text-sm font-extrabold uppercase tracking-wide">
              <UserPlus className="h-4 w-4 text-primary" />
              {editingUserId
                ? "Editar Usuário & Nível de Acesso"
                : "Cadastrar Novo Usuário / Vendedor FV"}
            </h2>

            <form
              action={async (fd) => {
                await createStaffUserAction(fd);
                setSuccessModalMsg("O Usuário foi salvo com o Nível de Acesso selecionado!");
                handleResetUserForm();
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <input type="hidden" name="id" value={editingUserId} />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block font-bold">
                  Nome Completo *
                  <input
                    name="name"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex.: Adilson Rodrigues"
                    className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                  />
                </label>

                <label className="block font-bold">
                  Usuário de Login (FV) *
                  <input
                    name="username"
                    required
                    value={userLogin}
                    onChange={(e) => setUserLogin(e.target.value.toLowerCase())}
                    placeholder="Ex.: adilson"
                    className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 font-mono text-sm font-medium lowercase"
                  />
                </label>

                <label className="block font-bold">
                  Senha de Acesso (FV) *
                  <input
                    name="password"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Ex.: 5122"
                    className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 font-mono text-sm font-medium"
                  />
                </label>

                <label className="block font-bold">
                  E-mail
                  <input
                    name="email"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="adilson@procontrol.com.br"
                    className="mt-1 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-medium"
                  />
                </label>
              </div>

              {/* Seleção do Nível de Acesso cadastrado na empresa */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-foreground">
                    Nível de Acesso do Usuário *
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenInsertLevel}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Criar novo Nível de Acesso
                  </button>
                </div>

                <select
                  name="accessLevelId"
                  value={selectedAccessLevelId}
                  onChange={(e) => setSelectedAccessLevelId(e.target.value)}
                  className="mt-1.5 block h-9 w-full rounded border border-slate-300 bg-background px-3 text-sm font-bold"
                >
                  {sortedLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.code} - {lvl.name}
                    </option>
                  ))}
                </select>

                {selectedLevelObj && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {selectedLevelObj.permissions
                      .filter(
                        (p) =>
                          p.canView ||
                          p.canCreate ||
                          p.canUpdate ||
                          p.canDelete ||
                          p.canReport
                      )
                      .map((p) => {
                        const acts = [
                          p.canView && "Consultar",
                          p.canCreate && "Incluir",
                          p.canUpdate && "Alterar",
                          p.canDelete && "Excluir",
                          p.canReport && "Relatório",
                        ]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <span
                            key={p.moduleKey}
                            className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] font-semibold"
                          >
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <b>{p.moduleLabel}:</b> {acts}
                          </span>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingUserId && (
                  <button
                    type="button"
                    onClick={handleResetUserForm}
                    className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded bg-[#8CC63F] px-5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#7cb332]"
                >
                  {editingUserId ? "Salvar Alterações" : "Salvar Usuário"}
                </button>
              </div>
            </form>
          </div>

          {/* Tabela de Usuários Cadastrados com seu Nível de Acesso */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="border-b pb-2.5 text-sm font-extrabold uppercase tracking-wide">
              Usuários Cadastrados ({staffUsers.length})
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white bg-[#DCDCDC] text-slate-900">
                    <th className="w-16 border-r border-white px-2.5 py-2.5 text-center font-extrabold">
                      Código
                    </th>
                    <th className="border-r border-white px-3 py-2.5 font-extrabold">
                      Nome / Usuário FV
                    </th>
                    <th className="border-r border-white px-3 py-2.5 font-extrabold">
                      Nível de Acesso
                    </th>
                    <th className="w-24 px-2 py-2.5 text-center font-extrabold">
                      Opções
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map((u, idx) => {
                    const matchedLvl =
                      sortedLevels.find((l) => l.id === u.accessLevelId) ||
                      (u.role === "owner"
                        ? sortedLevels.find((l) => l.code === 1)
                        : u.role === "admin"
                        ? sortedLevels.find((l) => l.code === 3)
                        : sortedLevels.find((l) => l.code === 2));
                    const levelLabel =
                      u.accessLevelName ||
                      matchedLvl?.name ||
                      (u.role === "owner" ? "Administrador" : "ACESSO CAIXA");

                    return (
                      <tr
                        key={u.id}
                        className="border-b border-white bg-[#EFEFEF] text-slate-900 hover:bg-slate-200/70"
                      >
                        <td className="border-r border-white px-2.5 py-2.5 text-center font-mono font-bold">
                          {u.code ?? idx + 1}
                        </td>
                        <td className="border-r border-white px-3 py-2.5">
                          <div className="font-bold">{u.name}</div>
                          <div className="font-mono text-[11px] text-slate-600">
                            Login: <b>{u.username || u.email}</b> • Senha:{" "}
                            <b>{u.passwordPlainHint || "5122"}</b>
                          </div>
                        </td>
                        <td className="border-r border-white px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              matchedLvl && handleOpenLevel(matchedLvl, "edit")
                            }
                            className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-bold text-slate-900 shadow-2xs hover:underline"
                            title="Clique para ver/editar a matriz deste Nível de Acesso"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-[#8CC63F]" />
                            {matchedLvl ? `${matchedLvl.code} - ` : ""}
                            {levelLabel}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleLoadUserForEdit(u)}
                              title="Editar usuário e seu nível de acesso"
                              className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#8CC63F] text-white hover:opacity-90"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <form
                              action={deleteStaffUserAction}
                              className="inline"
                            >
                              <input type="hidden" name="id" value={u.id} />
                              <button
                                type="submit"
                                title="Excluir usuário"
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
      </div>
    </div>
  );
}

