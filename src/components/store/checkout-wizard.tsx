"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { formatBRL, initialOf, splitName } from "@/modules/store/format";
import { checkoutOrderAction } from "@/modules/store/actions";
import type { CartDetail } from "@/modules/store/session";

export interface CheckoutCustomerData {
  id: string;
  code: number;
  name: string;
  tradeName: string;
  document: string;
  address: string;
  neighborhood: string;
  city: string;
  cep: string;
  ibge: string;
  contactName: string;
  countryCode: string;
  phone: string;
  email: string;
  site: string;
}

interface Props {
  cnpj: string;
  base: string;
  cart: CartDetail;
  customer: CheckoutCustomerData;
  paymentMethods: { id: string; name: string; kind: string }[];
}

export function CheckoutWizard({
  cnpj,
  base,
  cart,
  customer,
  paymentMethods,
}: Props) {
  const [step, setStep] = useState<"pagamento" | "entrega" | "demonstrativo">("pagamento");

  // Aba 1: Pagamento (Acréscimos / Descontos + Forma de Pagamento)
  const [adjustmentType, setAdjustmentType] = useState<"acrescimo" | "desconto">("acrescimo");
  const [adjustmentPercent, setAdjustmentPercent] = useState<string>("");
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const [paymentChoice, setPaymentChoice] = useState<"combinar" | "cartao" | "informar">("combinar");
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id ?? "");

  // Aba 2: Entrega (Observações, Forma de Entrega, Endereço e Contato)
  const [notes, setNotes] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("Combinar com a Loja.");
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState(customer.address);
  const [neighborhood, setNeighborhood] = useState(customer.neighborhood);
  const [city, setCity] = useState(customer.city);
  const [cep, setCep] = useState(customer.cep);
  const [ibge, setIbge] = useState(customer.ibge);

  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState(customer.contactName);
  const [countryCode, setCountryCode] = useState(customer.countryCode || "1058");
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [site, setSite] = useState(customer.site);

  const subtotalCents = cart.totalCents;

  // Sincroniza % -> R$
  const handlePercentChange = (val: string) => {
    setAdjustmentPercent(val);
    const num = parseFloat(val.replace(",", ".")) || 0;
    if (num <= 0) {
      setAdjustmentValue("");
      return;
    }
    const cents = Math.round((subtotalCents * num) / 100);
    setAdjustmentValue((cents / 100).toFixed(2).replace(".", ","));
  };

  // Sincroniza R$ -> %
  const handleValueChange = (val: string) => {
    setAdjustmentValue(val);
    const num = parseFloat(val.replace(",", ".")) || 0;
    if (num <= 0 || subtotalCents <= 0) {
      setAdjustmentPercent("");
      return;
    }
    const cents = Math.round(num * 100);
    const pct = ((cents / subtotalCents) * 100).toFixed(2).replace(/\.00$/, "");
    setAdjustmentPercent(pct);
  };

  const adjCents = Math.max(
    0,
    Math.round((parseFloat(adjustmentValue.replace(",", ".")) || 0) * 100)
  );
  const adjPctDisplay = parseFloat(adjustmentPercent.replace(",", ".")) || 0;

  const finalTotalCents =
    adjustmentType === "desconto"
      ? Math.max(0, subtotalCents - adjCents)
      : subtotalCents + adjCents;

  const selectedPaymentLabel =
    paymentChoice === "combinar"
      ? "Combinar com a Loja"
      : paymentChoice === "cartao"
      ? "Cartão de Crédito"
      : paymentMethods.find((p) => p.id === paymentMethodId)?.name || "Informar Meio de Pagamento";

  const tabClass = (active: boolean) =>
    `px-3.5 py-1.5 text-xs font-extrabold rounded-t-lg border border-b-0 transition ${
      active
        ? "bg-orange-500 text-white border-orange-500"
        : "bg-store-surface2 text-store-muted border-store-border hover:text-store-text"
    }`;

  return (
    <form action={checkoutOrderAction.bind(null, cnpj)}>
      {/* Campos ocultos enviados na submissão final */}
      <input type="hidden" name="adjustmentType" value={adjustmentType} />
      <input type="hidden" name="adjustmentPercent" value={String(adjPctDisplay)} />
      <input type="hidden" name="adjustmentValue" value={(adjCents / 100).toFixed(2)} />
      <input type="hidden" name="paymentChoice" value={paymentChoice} />
      <input type="hidden" name="paymentMethodId" value={paymentMethodId} />
      <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="neighborhood" value={neighborhood} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="cep" value={cep} />
      <input type="hidden" name="ibge" value={ibge} />
      <input type="hidden" name="contactName" value={contactName} />
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="site" value={site} />
      <input type="hidden" name="notes" value={notes} />

      {/* Abas superiores: Pagamento | Entrega | Demonstrativo | Concluir (Prints 4, 5 e 6) */}
      <div className="mt-4 flex flex-wrap gap-1 border-b border-store-border px-1">
        <button
          type="button"
          onClick={() => setStep("pagamento")}
          className={tabClass(step === "pagamento")}
        >
          Pagamento
        </button>
        <button
          type="button"
          onClick={() => setStep("entrega")}
          className={tabClass(step === "entrega")}
        >
          Entrega
        </button>
        <button
          type="button"
          onClick={() => setStep("demonstrativo")}
          className={tabClass(step === "demonstrativo")}
        >
          Demonstrativo
        </button>
        <span className={tabClass(false)}>Concluir</span>
      </div>

      {/* CONTEÚDO DA ABA 1: PAGAMENTO (Fiel ao Print 4) */}
      {step === "pagamento" && (
        <div className="space-y-6 rounded-b-xl border border-t-0 border-store-border bg-store-surface p-5">
          <div>
            <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold uppercase tracking-wide text-store-text">
              Acréscimos / Descontos:
            </h2>

            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center gap-6">
                <span className="w-28 font-bold text-store-muted">Subtotal:</span>
                <span className="font-extrabold text-store-text">
                  {formatBRL(subtotalCents)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={adjustmentType}
                  onChange={(e) =>
                    setAdjustmentType(e.target.value as "acrescimo" | "desconto")
                  }
                  className="h-9 rounded-lg border border-store-border bg-store-surface2 px-3 text-xs font-bold text-store-text"
                >
                  <option value="acrescimo">Acréscimo</option>
                  <option value="desconto">Desconto</option>
                </select>

                <input
                  type="text"
                  inputMode="decimal"
                  value={adjustmentPercent}
                  onChange={(e) => handlePercentChange(e.target.value)}
                  placeholder="0"
                  className="h-9 w-16 rounded-lg border border-store-border bg-store-surface2 px-2.5 text-center text-xs font-bold text-store-text"
                />
                <span className="font-extrabold text-store-text">%</span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={adjustmentValue}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="0,00"
                  className="h-9 w-36 rounded-lg border border-store-border bg-store-surface2 px-3 text-xs font-bold text-store-text"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <span className="w-28 font-bold text-store-muted">Total:</span>
                <span className="text-sm font-black text-store-text">
                  {formatBRL(finalTotalCents)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold uppercase tracking-wide text-store-text">
              Forma de Pagamento:
            </h2>

            <div className="mt-3 space-y-2.5 text-xs">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="radio"
                  name="pm_radio"
                  checked={paymentChoice === "combinar"}
                  onChange={() => setPaymentChoice("combinar")}
                  className="mt-0.5 h-4 w-4 accent-store-accent"
                />
                <div>
                  <span className="font-bold text-store-text">Combinar com a Loja.</span>
                  <p className="mt-0.5 text-[11px] text-store-muted">
                    Em breve você receberá instruções para o pagamento e envio, se necessário.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="pm_radio"
                  checked={paymentChoice === "cartao"}
                  onChange={() => setPaymentChoice("cartao")}
                  className="h-4 w-4 accent-store-accent"
                />
                <span className="font-bold text-store-muted line-through">
                  Cartão de Crédito.
                </span>
              </label>

              <div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="radio"
                    name="pm_radio"
                    checked={paymentChoice === "informar"}
                    onChange={() => setPaymentChoice("informar")}
                    className="h-4 w-4 accent-store-accent"
                  />
                  <span className="font-bold text-store-text">
                    Informar Meio de Pagamento.
                  </span>
                </label>

                {paymentChoice === "informar" && paymentMethods.length > 0 && (
                  <div className="mt-2 pl-6">
                    <select
                      value={paymentMethodId}
                      onChange={(e) => setPaymentMethodId(e.target.value)}
                      className="h-9 w-full max-w-xs rounded-lg border border-store-border bg-store-surface2 px-3 text-xs font-bold text-store-text"
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-store-border pt-4">
            <Link
              href={`${base}/carrinho`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-5 text-xs font-bold text-store-text hover:bg-store-border/40"
            >
              Voltar ao Carrinho
            </Link>
            <button
              type="button"
              onClick={() => setStep("entrega")}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-extrabold text-white shadow-xs hover:bg-orange-700"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: ENTREGA (Fiel ao Print 5) */}
      {step === "entrega" && (
        <div className="space-y-5 rounded-b-xl border border-t-0 border-store-border bg-store-surface p-5">
          <div>
            <label className="block text-xs font-bold text-store-muted">
              Observações / Instruções para Entrega:
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite observações para expedição ou entrega (opcional)..."
                className="mt-1.5 block w-full rounded-lg border border-store-border bg-store-surface2 p-2.5 text-xs text-store-text focus:outline-none focus:ring-2 focus:ring-store-accent"
              />
            </label>
          </div>

          <div>
            <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold text-store-text">
              Forma de Entrega:
            </h2>
            <div className="mt-2.5 space-y-2.5 text-xs">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="radio"
                  name="deliv_radio"
                  checked={deliveryMethod === "Combinar com a Loja."}
                  onChange={() => setDeliveryMethod("Combinar com a Loja.")}
                  className="mt-0.5 h-4 w-4 accent-store-accent"
                />
                <div>
                  <span className="font-bold text-store-text">Combinar com a Loja.</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-store-muted">
                    Esta opção permite que você combine como será a entrega dos produtos depois que a
                    compra for realizada. Poderá ser enviada pelo nosso setor de expedição ou
                    combinar a retirada do mesmo em nossa loja.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="deliv_radio"
                  checked={deliveryMethod === "Correios."}
                  onChange={() => setDeliveryMethod("Correios.")}
                  className="h-4 w-4 accent-store-accent"
                />
                <span className="font-bold text-store-muted line-through">Correios.</span>
              </label>
            </div>
          </div>

          {/* Endereço para Entrega */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-store-text">
                Endereço para Entrega:
              </h3>
              <button
                type="button"
                onClick={() => setEditingAddress((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:underline"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white">
                  <RefreshCw className="h-3 w-3" />
                </span>
                Alterar Endereço
              </button>
            </div>

            {editingAddress ? (
              <div className="mt-2 grid gap-2.5 rounded-lg border border-store-border bg-store-surface2/50 p-3 text-xs sm:grid-cols-2">
                <label className="sm:col-span-2">
                  Endereço:
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  Bairro:
                  <input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  Cidade:
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  CEP:
                  <input
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  IBGE:
                  <input
                    value={ibge}
                    onChange={(e) => setIbge(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-store-border bg-store-surface2/30 p-3 text-xs">
                <dl className="grid grid-cols-[120px_1fr] gap-y-1">
                  <dt className="text-store-muted">Tipo de Endereço:</dt>
                  <dd className="font-bold text-red-500">Principal</dd>
                  <dt className="text-store-muted">Localização:</dt>
                  <dd>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${address}, ${neighborhood}, ${city}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-store-accent hover:underline"
                    >
                      Ver no Mapa
                    </a>
                  </dd>
                  <dt className="text-store-muted">Endereço:</dt>
                  <dd className="font-bold text-store-text">{address}</dd>
                  <dt className="text-store-muted">Bairro:</dt>
                  <dd className="font-bold text-store-text">{neighborhood}</dd>
                  <dt className="text-store-muted">Cidade:</dt>
                  <dd className="font-bold text-store-text">{city}</dd>
                  <dt className="text-store-muted">CEP:</dt>
                  <dd className="font-bold text-store-text">{cep}</dd>
                  <dt className="text-store-muted">IBGE:</dt>
                  <dd className="font-bold text-store-text">{ibge}</dd>
                </dl>
              </div>
            )}
          </div>

          {/* Contato para Entrega */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-store-text">
                Contato para Entrega:
              </h3>
              <button
                type="button"
                onClick={() => setEditingContact((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:underline"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white">
                  <RefreshCw className="h-3 w-3" />
                </span>
                Alterar contato
              </button>
            </div>

            {editingContact ? (
              <div className="mt-2 grid gap-2.5 rounded-lg border border-store-border bg-store-surface2/50 p-3 text-xs sm:grid-cols-2">
                <label>
                  Nome do Contato:
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  Cód. País:
                  <input
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  Telefone 1:
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label>
                  Email:
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
                <label className="sm:col-span-2">
                  Site:
                  <input
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="mt-1 block h-8 w-full rounded border border-store-border bg-store-surface px-2.5"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-store-border bg-store-surface2/30 p-3 text-xs">
                <dl className="grid grid-cols-[120px_1fr] gap-y-1">
                  <dt className="text-store-muted">Tipo de contato:</dt>
                  <dd className="font-bold text-red-500">Principal</dd>
                  <dt className="text-store-muted">Nome do Contato:</dt>
                  <dd className="font-bold text-store-text">{contactName}</dd>
                  <dt className="text-store-muted">Cód. País:</dt>
                  <dd className="font-bold text-store-text">{countryCode}</dd>
                  <dt className="text-store-muted">Telefone 1:</dt>
                  <dd className="font-bold text-store-text">{phone}</dd>
                  <dt className="text-store-muted">Email:</dt>
                  <dd className="font-bold text-store-text">{email}</dd>
                  <dt className="text-store-muted">Site:</dt>
                  <dd className="font-bold text-store-text">{site}</dd>
                </dl>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-store-border pt-4">
            <Link
              href={`${base}/carrinho`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-4 text-xs font-bold text-store-text hover:bg-store-border/40"
            >
              Voltar ao Carrinho
            </Link>
            <button
              type="button"
              onClick={() => setStep("pagamento")}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-5 text-xs font-bold text-store-text hover:bg-store-border/40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep("demonstrativo")}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-extrabold text-white shadow-xs hover:bg-orange-700"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: DEMONSTRATIVO (Fiel ao Print 6) */}
      {step === "demonstrativo" && (
        <div className="space-y-5 rounded-b-xl border border-t-0 border-store-border bg-store-surface p-5">
          {/* ÍTENS NO CARRINHO */}
          <div>
            <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold uppercase text-store-text">
              ÍTENS NO CARRINHO:
            </h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-store-border">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-store-border bg-store-surface2 text-store-text">
                    <th className="border-r border-store-border px-3 py-2 font-extrabold">
                      Produto
                    </th>
                    <th className="w-20 border-r border-store-border px-2 py-2 text-center font-extrabold">
                      Quant.
                    </th>
                    <th className="w-28 border-r border-store-border px-3 py-2 text-right font-extrabold">
                      Valor
                    </th>
                    <th className="w-28 px-3 py-2 text-right font-extrabold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-store-border">
                  {cart.lines.map(({ product, qty, effectiveUnitCents, subtotalCents }, idx) => {
                    const { title } = splitName(product.name);
                    return (
                      <tr key={product.id}>
                        <td className="border-r border-store-border px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="h-9 w-9 rounded border bg-white object-contain p-0.5"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded bg-store-surface2 font-bold text-store-muted">
                                {initialOf(product.name)}
                              </div>
                            )}
                            <div>
                              <p className="text-[11px] font-bold text-store-accent">
                                Item: {idx + 1} &nbsp; Unidade: {product.unit}
                              </p>
                              <p className="font-bold text-store-text">{title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="border-r border-store-border px-2 py-2 text-center font-bold">
                          {qty}
                        </td>
                        <td className="border-r border-store-border px-3 py-2 text-right">
                          {effectiveUnitCents === null
                            ? "Sob consulta"
                            : formatBRL(effectiveUnitCents)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold">
                          {subtotalCents === null ? "Sob consulta" : formatBRL(subtotalCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-col items-end space-y-1 text-xs">
              <div className="flex w-56 justify-between">
                <span className="font-bold text-store-muted">Subtotal:</span>
                <span className="font-extrabold text-store-text">{formatBRL(subtotalCents)}</span>
              </div>
              <div className="flex w-56 justify-between">
                <span className="font-bold text-store-muted">
                  {adjustmentType === "desconto" ? "Desconto" : "Acréscimo"} de{" "}
                  {adjPctDisplay}%:
                </span>
                <span className="font-extrabold text-store-text">{formatBRL(adjCents)}</span>
              </div>
              <div className="flex w-56 justify-between border-t border-store-border pt-1 text-sm">
                <span className="font-extrabold text-store-text">Total:</span>
                <span className="font-black text-store-text">{formatBRL(finalTotalCents)}</span>
              </div>
            </div>
          </div>

          {/* PAGAMENTO */}
          <div>
            <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold uppercase text-store-text">
              PAGAMENTO:
            </h2>
            <div className="mt-2 rounded-lg border border-store-border bg-store-surface2/30 p-3 text-xs">
              <span className="text-store-muted">Forma de Pagamento: </span>
              <b className="ml-4 text-store-text">{selectedPaymentLabel}</b>
            </div>
          </div>

          {/* DADOS PARA PRIMEIRA ENTREGA */}
          <div>
            <h2 className="border-b border-store-border pb-1.5 text-xs font-extrabold uppercase text-store-text">
              DADOS PARA PRIMEIRA ENTREGA:
            </h2>
            <div className="mt-2 space-y-3 rounded-lg border border-store-border bg-store-surface2/30 p-3 text-xs">
              <div>
                <p className="mb-1 font-extrabold text-store-text">Dados do Cliente:</p>
                <dl className="grid grid-cols-[120px_1fr] gap-y-1">
                  <dt className="text-store-muted">Nome:</dt>
                  <dd className="font-bold uppercase text-store-text">{customer.name}</dd>
                  <dt className="text-store-muted">Nome Fantasia:</dt>
                  <dd className="font-bold uppercase text-store-text">{customer.tradeName}</dd>
                  <dt className="text-store-muted">CNPJ:</dt>
                  <dd className="font-mono font-bold text-store-text">{customer.document}</dd>
                </dl>
              </div>

              <div className="border-t border-store-border pt-2">
                <p className="mb-1 font-extrabold text-store-text">Endereço e Contato de Entrega:</p>
                <dl className="grid grid-cols-[120px_1fr] gap-y-1">
                  <dt className="text-store-muted">Forma de Envio:</dt>
                  <dd className="font-bold text-store-text">{deliveryMethod}</dd>
                  <dt className="text-store-muted">Endereço:</dt>
                  <dd className="font-bold text-store-text">
                    {address} — {neighborhood}, {city} (CEP {cep})
                  </dd>
                  <dt className="text-store-muted">Contato:</dt>
                  <dd className="font-bold text-store-text">
                    {contactName} • Tel: {countryCode} {phone} • {email}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-store-border pt-4">
            <Link
              href={`${base}/carrinho`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-4 text-xs font-bold text-store-text hover:bg-store-border/40"
            >
              Voltar ao Carrinho
            </Link>
            <button
              type="button"
              onClick={() => setStep("entrega")}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-5 text-xs font-bold text-store-text hover:bg-store-border/40"
            >
              Anterior
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-extrabold text-white shadow-xs hover:bg-orange-700"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

