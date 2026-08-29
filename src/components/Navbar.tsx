"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, FileWarning } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";
import { EDITIONS } from "@/lib/editions";
import { cn } from "@/lib/utils";

const LINK =
  "inline-flex h-11 items-center gap-1.5 rounded-chip px-3 text-sm transition-colors focus-visible:outline-brand-500";

/**
 * Menu de ediciones sobre <details> nativo: abre y cierra sin JavaScript y es
 * navegable por teclado de fabrica. Solo agregamos cerrar con Esc y al hacer
 * clic fuera, que el elemento no trae.
 */
function CatalogMenu({ pathname }: { pathname: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => ref.current?.removeAttribute("open");

    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // El menu se cierra solo al cambiar de ruta.
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  const enCatalogo = pathname.startsWith("/catalogo");

  return (
    <details ref={ref} className="relative">
      <summary
        className={cn(
          LINK,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          enCatalogo ? "text-ink" : "text-muted hover:text-ink",
        )}
      >
        Catálogo
        <ChevronDown size={15} aria-hidden="true" className="opacity-70" />
      </summary>

      <div className="border-line bg-panel shadow-panel rounded-card absolute left-0 z-20 mt-2 w-60 overflow-hidden border py-1.5">
        <Link
          href="/catalogo"
          className={cn(
            "block px-4 py-2.5 text-sm transition-colors",
            pathname === "/catalogo" || pathname === "/catalogo/"
              ? "text-accent bg-accent-soft"
              : "text-ink hover:bg-surface",
          )}
        >
          Todo
        </Link>

        <hr className="border-line my-1.5" />

        {EDITIONS.map((ed) => {
          const href = `/catalogo/${ed.slug}`;
          const activa = pathname === href || pathname === `${href}/`;

          if (!ed.cargada) {
            return (
              <span
                key={ed.slug}
                aria-disabled="true"
                title="Todavía no cargada"
                className="text-muted/60 flex items-center justify-between px-4 py-2.5 text-sm"
              >
                {ed.titulo}
                <span className="text-[10px] tracking-[0.14em] uppercase">pronto</span>
              </span>
            );
          }

          return (
            <Link
              key={ed.slug}
              href={href}
              className={cn(
                "block px-4 py-2.5 text-sm transition-colors",
                activa ? "text-accent bg-accent-soft" : "text-ink hover:bg-surface",
              )}
            >
              {ed.titulo}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-line bg-bg/85 sticky top-0 z-30 border-b backdrop-blur">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-[1280px] items-center gap-2 px-6 py-3"
      >
        <Link href="/" className="focus-visible:outline-brand-500 mr-2 rounded">
          <Image
            src="/brand/logo-white.svg"
            alt="DeckForge"
            width={140}
            height={28}
            priority
          />
        </Link>

        <CatalogMenu pathname={pathname} />

        <Link
          href="/erratas"
          className={cn(
            LINK,
            pathname.startsWith("/erratas") ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          <FileWarning size={15} aria-hidden="true" className="opacity-70" />
          Erratas
        </Link>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
