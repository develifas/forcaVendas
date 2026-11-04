/**
 * Constantes compartilhadas seguras para uso tanto no cliente quanto no servidor.
 * NÃO importe módulos de Node.js (como 'fs' ou 'path') neste arquivo.
 */

export const ACCESS_LEVEL_MODULES = [
  { key: "cliente", label: "Cliente" },
  { key: "parametros", label: "Parâmetros" },
  { key: "consultar", label: "consultar" },
  { key: "contas_email", label: "Contas de E-mail" },
  { key: "grupo_subgrupo", label: "Grupo/Subgrupo" },
  { key: "importar_exportar", label: "Importar / Exportar" },
  { key: "forma_pagamento", label: "Forma de Pagamento" },
  { key: "nivel_acesso", label: "Nível de Acesso" },
  { key: "produto", label: "Produto" },
  { key: "usuario", label: "Usuário" },
  { key: "venda", label: "Venda" },
] as const;

export type AccessLevelModuleKey = (typeof ACCESS_LEVEL_MODULES)[number]["key"];

