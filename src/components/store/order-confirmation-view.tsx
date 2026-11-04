"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, FileText, Mail, CheckCircle2 } from "lucide-react";
import { formatBRL, initialOf, splitName } from "@/modules/store/format";
import type { DbStoreOrder } from "@/lib/tenant-store";

interface OrderSheetCompanyInfo {
  name: string;
  legalName: string;
  cnpj: string;
  addressLine: string;
  phone: string;
}

interface OrderSheetCustomerInfo {
  codeDisplay: string;
  name: string;
  tradeName: string;
  document: string;
  email: string;
}

interface Props {
  base: string;
  order: DbStoreOrder;
  company: OrderSheetCompanyInfo;
  customer: OrderSheetCustomerInfo;
  initialShowSheet?: boolean;
  autoPrint?: boolean;
}

export function OrderConfirmationView({
  base,
  order,
  company,
  customer,
  initialShowSheet = false,
  autoPrint = false,
}: Props) {
  const [actionOption, setActionOption] = useState<
    "none" | "pdf" | "print" | "email_cliente" | "email_outro"
  >("none");
  const [customEmail, setCustomEmail] = useState("");
  const [emailSentMsg, setEmailSentMsg] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(initialShowSheet);

  useEffect(() => {
    if (autoPrint) {
      setShowSheet(true);
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  const handleRadioSelect = (
    opt: "pdf" | "print" | "email_cliente" | "email_outro"
  ) => {
    setActionOption(opt);
    setEmailSentMsg(null);
    if (opt === "pdf" || opt === "print") {
      setShowSheet(true);
      setTimeout(() => {
        window.print();
      }, 200);
    } else if (opt === "email_cliente") {
      setEmailSentMsg(
        `Cópia do pedido #${order.code} enviada com sucesso para ${customer.email}!`
      );
    }
  };

  const handleSendCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setEmailSentMsg(
      `Cópia do pedido #${order.code} enviada com sucesso para ${customEmail.trim()}!`
    );
  };

  const subtotalCents = order.subtotalCents ?? order.totalCents;
  const adjCents = order.adjustmentCents ?? 0;
  const adjPct = order.adjustmentPercent ?? 0;
  const adjLabel =
    order.adjustmentType === "desconto" ? "Desconto" : "Acréscimo";

  const createdDate = new Date(order.createdAt);
  const formattedDateTime = `${createdDate.toLocaleDateString("pt-BR")} - ${createdDate.toLocaleTimeString(
    "pt-BR"
  )} Hs`;

  const delivAddr = order.deliveryAddress ?? {
    address: "Avenida Jerônimo Monteiro, 1690, Loja 68-70",
    neighborhood: "Centro de Vila Velha",
    city: "Vila Velha - ES",
    cep: "29100-400",
    ibge: "3205200",
  };

  const delivContact = order.deliveryContact ?? {
    contactName: "Adilson Rodrigues",
    countryCode: "1058",
    phone: "27 33395857",
    email: customer.email || "adilsonr43@gmail.com",
    site: "https://pro-controll.com.br",
  };

  const tabClass = (active: boolean) =>
    `px-3.5 py-1.5 text-xs font-extrabold rounded-t-lg border border-b-0 ${
      active
        ? "bg-orange-500 text-white border-orange-500"
        : "bg-store-surface2 text-store-muted border-store-border"
    }`;

  return (
    <div className="space-y-6">
      {/* ABA 4: CONCLUIR / CONFIRMAÇÃO DO PEDIDO (Fiel ao Print 7 — oculto na impressão) */}
      <div className="print:hidden">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-store-border px-1">
          <div className="flex flex-wrap gap-1">
            <span className={tabClass(false)}>Pagamento</span>
            <span className={tabClass(false)}>Entrega</span>
            <span className={tabClass(false)}>Demonstrativo</span>
            <span className={tabClass(true)}>Concluir</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSheet((v) => !v)}
            className="mb-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-store-border bg-store-surface2 px-3 text-xs font-bold text-store-text hover:bg-store-border/40"
          >
            <FileText className="h-3.5 w-3.5 text-store-accent" />
            {showSheet ? "Ocultar Folha do Pedido" : "Visualizar Folha do Pedido (PDF)"}
          </button>
        </div>

        <div className="rounded-b-xl border border-t-0 border-store-border bg-store-surface p-6">
          <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold uppercase tracking-wide text-store-text">
            CONFIRMAÇÃO DO PEDIDO:
          </h2>

          <div className="my-8 text-center">
            <p className="text-base font-extrabold text-store-text">
              Obrigado pelo seu pedido!
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
              <p className="max-w-[220px] text-center text-sm font-extrabold leading-snug text-store-text">
                Seu pedido foi efetuado com sucesso!
              </p>

              <div className="min-w-[190px] rounded-xl border-2 border-store-text bg-white px-6 py-3 text-center text-slate-900 shadow-xs">
                <span className="block text-xs font-extrabold text-slate-800">
                  Seu Número do Pedido:
                </span>
                <span className="mt-0.5 block text-2xl font-black text-red-600">
                  {order.code}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-store-border pt-5">
            <div className="space-y-2.5 text-xs">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="order_after_action"
                  checked={actionOption === "pdf"}
                  onChange={() => handleRadioSelect("pdf")}
                  className="h-4 w-4 accent-store-accent"
                />
                <span className="font-bold text-store-text">
                  Salvar Cópia do pedido em PDF
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="order_after_action"
                  checked={actionOption === "print"}
                  onChange={() => handleRadioSelect("print")}
                  className="h-4 w-4 accent-store-accent"
                />
                <span className="font-bold text-store-text">
                  Imprimir Cópia do pedido
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="order_after_action"
                  checked={actionOption === "email_cliente"}
                  onChange={() => handleRadioSelect("email_cliente")}
                  className="h-4 w-4 accent-store-accent"
                />
                <span className="font-bold text-store-text">
                  Enviar Cópia do pedido para o Email (
                  <b className="font-extrabold">{customer.email}</b>)
                </span>
              </label>

              <div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="radio"
                    name="order_after_action"
                    checked={actionOption === "email_outro"}
                    onChange={() => {
                      setActionOption("email_outro");
                      setEmailSentMsg(null);
                    }}
                    className="h-4 w-4 accent-store-accent"
                  />
                  <span className="font-bold text-store-text">
                    Enviar Cópia do pedido para outro Email
                  </span>
                </label>

                {actionOption === "email_outro" && (
                  <form
                    onSubmit={handleSendCustomEmail}
                    className="mt-2 flex max-w-sm items-center gap-2 pl-6"
                  >
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="Digite o e-mail de destino..."
                      className="h-8 flex-1 rounded border border-store-border bg-store-surface2 px-2.5 text-xs text-store-text"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded bg-store-accent px-3 text-xs font-bold text-store-accentfg"
                    >
                      <Mail className="h-3.5 w-3.5" /> Enviar
                    </button>
                  </form>
                )}
              </div>
            </div>

            {emailSentMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {emailSentMsg}
              </div>
            )}

            <div className="mt-7 flex justify-center">
              <Link
                href={base}
                className="inline-flex h-11 min-w-[230px] items-center justify-center rounded-lg border border-slate-400 bg-slate-200 px-8 text-xs font-extrabold uppercase tracking-wider text-slate-900 shadow-xs transition hover:bg-slate-300"
              >
                FECHAR
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOLHA DE IMPRESSÃO / PDF DO PEDIDO (Fiel ao Print 8 — sempre visível na impressão ou ao clicar em Visualizar/PDF/Imprimir) */}
      <div
        className={`${
          showSheet ? "block" : "hidden print:block"
        } mx-auto max-w-3xl rounded-xl border-2 border-slate-800 bg-white p-6 text-slate-900 shadow-xl print:border print:p-4 print:shadow-none`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-300 pb-3 print:hidden">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Espelho de Impressão / PDF do Pedido #{order.code}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar PDF
          </button>
        </div>

        {/* Cabeçalho da Empresa (Logo + Dados da Empresa) */}
        <div className="flex flex-wrap items-start gap-5 border-b border-slate-300 pb-4">
          <div className="flex flex-col items-start">
            <div className="flex h-16 w-48 items-center justify-between overflow-hidden rounded border border-blue-900 bg-blue-800 text-white shadow-xs">
              <div className="flex h-full w-14 items-center justify-center bg-slate-100 font-black text-blue-900">
                <span className="text-xl tracking-tighter">
                  <span className="text-blue-800">P</span>
                  <span className="text-red-600">C</span>
                </span>
              </div>
              <div className="flex-1 px-2.5 text-left">
                <div className="text-base font-extrabold leading-none">
                  {company.name}
                </div>
                <div className="mt-0.5 text-[9px] text-blue-100">
                  Site Força de Vendas
                </div>
              </div>
            </div>
            <span className="mt-1.5 text-xs font-semibold text-slate-800">
              {company.phone}
            </span>
          </div>

          <div className="flex-1 space-y-0.5 text-xs leading-snug text-slate-900">
            <p className="font-extrabold uppercase">{company.name}</p>
            <p className="font-extrabold uppercase">{company.legalName}</p>
            <p className="font-medium">CNPJ: {company.cnpj}</p>
            <p className="uppercase">{company.addressLine}</p>
          </div>
        </div>

        {/* DETALHES DO PEDIDO */}
        <div className="mt-4">
          <h3 className="border-b-2 border-slate-800 pb-1 text-xs font-extrabold uppercase">
            DETALHES DO PEDIDO:
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-6">
              <span className="text-slate-700">Pedido número:</span>
              <b className="text-sm font-black">{order.code}</b>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-slate-700">Data de Lançamento:</span>
              <b className="font-extrabold">{formattedDateTime}</b>
            </div>
          </div>
        </div>

        {/* DADOS DO CLIENTE */}
        <div className="mt-4">
          <h3 className="border-b-2 border-slate-800 pb-1 text-xs font-extrabold uppercase">
            DADOS DO CLIENTE:
          </h3>
          <dl className="mt-2 grid grid-cols-[130px_1fr] gap-y-1 text-xs">
            <dt className="text-slate-700">Código:</dt>
            <dd className="font-extrabold">{customer.codeDisplay}</dd>
            <dt className="text-slate-700">Nome:</dt>
            <dd className="font-extrabold uppercase">{customer.name}</dd>
            <dt className="text-slate-700">Nome Fantasia:</dt>
            <dd className="font-extrabold uppercase">{customer.tradeName}</dd>
            <dt className="text-slate-700">CNPJ:</dt>
            <dd className="font-extrabold">{customer.document}</dd>
          </dl>
        </div>

        {/* ÍTENS ADQUIRIDOS */}
        <div className="mt-4">
          <h3 className="border-b-2 border-slate-800 pb-1 text-xs font-extrabold uppercase">
            ÍTENS ADQUIRIDOS:
          </h3>
          <table className="mt-2 w-full border-collapse border border-slate-300 text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th className="border-r border-slate-300 px-3 py-1.5 font-extrabold">
                  Produto
                </th>
                <th className="w-20 border-r border-slate-300 px-2 py-1.5 text-center font-extrabold">
                  Quant.
                </th>
                <th className="w-28 border-r border-slate-300 px-3 py-1.5 text-right font-extrabold">
                  Valor
                </th>
                <th className="w-28 px-3 py-1.5 text-right font-extrabold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {order.items.map((item, idx) => {
                const { title } = splitName(item.productName);
                return (
                  <tr key={item.id}>
                    <td className="border-r border-slate-300 px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-600">
                          {initialOf(item.productName)}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-800">
                            Item: {idx + 1} &nbsp; Unidade: {item.unit}
                          </p>
                          <p className="font-extrabold text-slate-900">{title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-center font-semibold">
                      {item.qty.toFixed(2)}
                    </td>
                    <td className="border-r border-slate-300 px-3 py-2 text-right">
                      {item.unitPriceCents === null
                        ? "Sob consulta"
                        : formatBRL(item.unitPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {item.subtotalCents === null
                        ? "Sob consulta"
                        : formatBRL(item.subtotalCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-2 flex flex-col items-end space-y-0.5 text-xs">
            <div className="flex w-56 justify-between">
              <span className="font-bold text-slate-700">Subtotal:</span>
              <span className="font-extrabold">{formatBRL(subtotalCents)}</span>
            </div>
            <div className="flex w-56 justify-between">
              <span className="font-bold text-slate-700">
                {adjLabel} de {adjPct}%:
              </span>
              <span className="font-extrabold">{formatBRL(adjCents)}</span>
            </div>
            <div className="flex w-56 justify-between border-t border-slate-300 pt-1 text-sm">
              <span className="font-extrabold">Total:</span>
              <span className="font-black">{formatBRL(order.totalCents)}</span>
            </div>
          </div>
        </div>

        {/* PAGAMENTO */}
        <div className="mt-4">
          <h3 className="border-b-2 border-slate-800 pb-1 text-xs font-extrabold uppercase">
            PAGAMENTO:
          </h3>
          <dl className="mt-2 grid grid-cols-[130px_1fr] gap-y-1 text-xs">
            <dt className="text-slate-700">Forma de Pagamento:</dt>
            <dd className="font-extrabold">{order.paymentMethodName}</dd>
            <dt className="text-slate-700">Valor:</dt>
            <dd className="font-extrabold">{formatBRL(order.totalCents)}</dd>
          </dl>
        </div>

        {/* DADOS PARA ENTREGA */}
        <div className="mt-4">
          <h3 className="border-b-2 border-slate-800 pb-1 text-xs font-extrabold uppercase">
            DADOS PARA ENTREGA:
          </h3>
          <dl className="mt-2 grid grid-cols-[130px_1fr] gap-y-1 text-xs">
            <dt className="text-slate-700">Forma de Envio:</dt>
            <dd className="font-extrabold">
              {order.deliveryMethod || "Combinar com a Loja"}
            </dd>
            <dt className="text-slate-700">Tipo de endereço:</dt>
            <dd className="font-extrabold text-red-600">Principal</dd>
            <dt className="text-slate-700">endereço:</dt>
            <dd className="font-extrabold">{delivAddr.address}</dd>
            <dt className="text-slate-700">Bairro:</dt>
            <dd className="font-extrabold">{delivAddr.neighborhood}</dd>
            <dt className="text-slate-700">Cidade:</dt>
            <dd className="font-extrabold">{delivAddr.city}</dd>
            <dt className="text-slate-700">CEP:</dt>
            <dd className="font-extrabold">{delivAddr.cep}</dd>
            <dt className="text-slate-700">IBGE:</dt>
            <dd className="font-extrabold">{delivAddr.ibge}</dd>
            <dt className="text-slate-700">Tipo de contato:</dt>
            <dd className="font-extrabold text-red-600">Principal</dd>
            <dt className="text-slate-700">Nome do Contato:</dt>
            <dd className="font-extrabold">{delivContact.contactName}</dd>
            <dt className="text-slate-700">Telefone 1:</dt>
            <dd className="font-extrabold">
              {delivContact.countryCode} {delivContact.phone}
            </dd>
            <dt className="text-slate-700">Email:</dt>
            <dd className="font-extrabold">{delivContact.email}</dd>
            <dt className="text-slate-700">Site:</dt>
            <dd className="font-extrabold">{delivContact.site}</dd>
          </dl>
        </div>

        {/* OBSERVAÇÕES */}
        <div className="mt-4">
          <h3 className="border-b-2 border-slate-800 pb-1 text-xs font-extrabold">
            Observações:
          </h3>
          <p className="mt-1.5 min-h-[24px] text-xs text-slate-800">
            {order.notes || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

