"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DbStoreBanner } from "@/lib/tenant-store";

interface StoreBannerCarouselProps {
  banners: DbStoreBanner[];
  storeName: string;
}

export function StoreBannerCarousel({
  banners,
  storeName,
}: StoreBannerCarouselProps) {
  const activeBanners = (banners || [])
    .filter((b) => b.status !== "inativo" && b.isActive !== false && Boolean(b.imageUrl || b.name))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = activeBanners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play: avança automaticamente a cada 5 segundos se não estiver pausado
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  if (total === 0) return null;

  // Se houver apenas 1 banner ativo, renderiza estático sem controles de carrossel
  if (total === 1) {
    const banner = activeBanners[0];
    const content = (
      <div className="group relative w-full overflow-hidden rounded-2xl border border-store-border bg-store-surface shadow-sm transition hover:shadow-md">
        <div className="relative h-44 w-full sm:h-56 md:h-64 lg:h-72">
          {banner.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.imageUrl}
              alt={banner.name || `Banner ${storeName}`}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-lg">
              {banner.name}
            </div>
          )}
        </div>
      </div>
    );

    if (banner.linkUrl) {
      return (
        <Link href={banner.linkUrl} className="block w-full cursor-pointer">
          {content}
        </Link>
      );
    }
    return content;
  }

  // Carrossel com 2 ou mais banners
  const currentBanner = activeBanners[currentIndex];

  const slideContent = (
    <div className="relative h-44 w-full sm:h-56 md:h-64 lg:h-72">
      {currentBanner.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={currentBanner.id}
          src={currentBanner.imageUrl}
          alt={currentBanner.name || `Banner ${currentIndex + 1} de ${total}`}
          className="h-full w-full object-cover object-center transition-opacity duration-500 animate-fadeIn"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-lg">
          {currentBanner.name}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="group relative w-full overflow-hidden rounded-2xl border border-store-border bg-store-surface shadow-sm transition hover:shadow-md"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Banners de destaque de ${storeName}`}
    >
      {currentBanner.linkUrl ? (
        <Link href={currentBanner.linkUrl} className="block w-full cursor-pointer">
          {slideContent}
        </Link>
      ) : (
        slideContent
      )}

      {/* Botão Anterior */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          prevSlide();
        }}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 sm:left-4"
        aria-label="Banner anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Botão Próximo */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          nextSlide();
        }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 sm:right-4"
        aria-label="Próximo banner"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Indicadores / Pontos de Navegação */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        {activeBanners.map((b, idx) => (
          <button
            key={b.id || idx}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
            className={`h-2 rounded-full transition-all ${
              idx === currentIndex
                ? "w-6 bg-white"
                : "w-2 bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Ir para o banner ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

