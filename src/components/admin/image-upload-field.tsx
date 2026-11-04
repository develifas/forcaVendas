"use client";

import React, { useRef, useState, useTransition } from "react";
import { ImagePlus, Link2, Trash2, Upload, Camera, Check } from "lucide-react";
import { updateProductImageAction } from "@/modules/admin/actions";

/**
 * Redimensiona/otimiza uma imagem no cliente (máx 1000px) para DataURL JPEG/PNG
 * evitando estourar limites de payload e acelerando o salvamento local.
 */
async function fileToOptimizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(result);
          return;
        }
        // Fundo branco para imagens com transparência convertidas em JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUploadField() {
  const [previews, setPreviews] = useState<{ name: string; dataUrl: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const converted: { name: string; dataUrl: string }[] = [];
    for (const file of validFiles.slice(0, 6)) {
      try {
        const dataUrl = await fileToOptimizedDataUrl(file);
        converted.push({ name: file.name, dataUrl });
      } catch {
        // ignora arquivo inválido
      }
    }
    setPreviews((prev) => [...prev, ...converted].slice(0, 6));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">
          Fotos do Produto (enviar do computador ou URL)
        </span>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <Link2 className="h-3 w-3" />
          {showUrlInput ? "Ocultar campo de URL" : "Ou informar URL / Galeria"}
        </button>
      </div>

      {/* Inputs hidden que enviam as imagens otimizadas para a Server Action */}
      {previews.map((item, idx) => (
        <input key={idx} type="hidden" name="uploadedDataUrls" value={item.dataUrl} />
      ))}

      {/* Área de Upload do Computador (Clique ou Arraste) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed p-3 transition ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/25 hover:border-primary/60"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ImagePlus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              Subir imagem do computador
            </p>
            <p className="text-[11px] text-muted-foreground">
              Arraste fotos para cá ou clique no botão ao lado (JPG, PNG, WEBP — até 6 fotos)
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          name="imageFiles"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-bold shadow-xs transition hover:bg-accent"
        >
          <Upload className="h-3.5 w-3.5 text-primary" />
          Escolher arquivo...
        </button>
      </div>

      {/* Miniaturas das fotos selecionadas do computador */}
      {previews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {previews.map((item, idx) => (
            <div
              key={idx}
              className="group relative h-16 w-16 overflow-hidden rounded-lg border bg-white p-1 shadow-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.dataUrl}
                alt={item.name}
                className="h-full w-full object-contain"
              />
              {idx === 0 && (
                <span className="absolute bottom-0.5 left-0.5 rounded bg-primary px-1 py-0.2 text-[9px] font-bold text-primary-foreground">
                  Capa
                </span>
              )}
              <button
                type="button"
                onClick={() => removePreview(idx)}
                title="Remover foto"
                className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-1 text-white opacity-90 shadow hover:opacity-100"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campo opcional de URL ou seleção rápida de fotos de exemplo */}
      {showUrlInput && (
        <div className="rounded-lg border bg-muted/20 p-2.5">
          <label className="block text-[11px] font-semibold text-muted-foreground">
            URL da imagem ou caminho local (ex.: /produtos/p1.jpg)
            <input
              name="imageUrl"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://... ou /produtos/p1.jpg"
              className="mt-1 block h-8 w-full rounded-md border bg-background px-2.5 text-xs text-foreground"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground">
              Exemplos rápidos:
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
              const pathUrl = `/produtos/p${n}.jpg`;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setManualUrl(pathUrl)}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition ${
                    manualUrl === pathUrl
                      ? "border-primary bg-primary/15 font-bold text-primary"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  p{n}.jpg
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Botão compacto na tabela de produtos para trocar/subir foto de um produto já cadastrado
 * direto do computador com 1 clique.
 */
export function ProductRowImageUploader({
  productId,
  productName,
  currentImageUrl,
  initial,
}: {
  productId: string;
  productName: string;
  currentImageUrl: string | null;
  initial: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  const onFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    const dataUrl = await fileToOptimizedDataUrl(file);
    const fd = new FormData();
    fd.set("id", productId);
    fd.append("uploadedDataUrls", dataUrl);

    startTransition(async () => {
      await updateProductImageAction(fd);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    });
  };

  return (
    <div className="group relative h-11 w-11 shrink-0">
      {currentImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentImageUrl}
          alt={productName}
          className="h-11 w-11 rounded-md border bg-white object-contain p-0.5"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-md border bg-muted text-xs font-bold">
          {initial}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onFileSelect(e.target.files)}
        className="hidden"
      />

      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        title="Trocar foto (subir do computador)"
        className="absolute inset-0 flex items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
      >
        {justSaved ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

