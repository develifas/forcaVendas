"use client";

import { useState } from "react";
import { initialOf } from "@/modules/store/format";

/** Imagem principal grande + miniaturas clicáveis. Sem foto, mostra a inicial do produto. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div
        aria-label={`Sem foto: ${name}`}
        className="flex aspect-square w-full items-center justify-center rounded-2xl border border-store-border bg-store-surface2 text-7xl font-extrabold text-store-muted"
      >
        {initialOf(name)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-store-border bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[current]} alt={name} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              aria-current={i === current}
              className={`h-16 w-16 overflow-hidden rounded-xl border bg-white ${i === current ? "border-store-accent ring-2 ring-store-accent" : "border-store-border"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

