"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FileWarning, Hammer, Layers, LibraryBig, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const LINKS: NavLink[] = [
  { href: "/catalogo", label: "Catálogo", Icon: LibraryBig },
  { href: "/builder", label: "Builder", Icon: Hammer },
  { href: "/mazos", label: "Mis mazos", Icon: Layers },
  { href: "/erratas", label: "Erratas", Icon: FileWarning },
];

/** `/catalogo` tambien queda activo dentro de `/catalogo/bushido`. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LINK =
  "inline-flex h-11 items-center gap-1.5 rounded-chip px-3 text-sm transition-colors focus-visible:outline-brand-500";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cerrar con Escape. Al navegar lo cierra el onClick de cada enlace: hacerlo
  // en un efecto sobre pathname dispararia un render en cascada.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="border-line bg-bg/85 sticky top-0 z-30 border-b backdrop-blur">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-[1480px] items-center gap-2 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="focus-visible:outline-brand-500 mr-1 rounded sm:mr-2">
          {/* El logotipo blanco es invisible sobre el fondo claro: cada tema
              usa su version y el CSS elige cual se muestra. */}
          <Image
            src="/brand/logo-white.svg"
            alt="DeckForge"
            width={140}
            height={28}
            priority
            className="solo-oscuro"
          />
          <Image
            src="/brand/logo-violet.svg"
            alt="DeckForge"
            width={140}
            height={28}
            priority
            className="solo-claro"
          />
        </Link>

        {/* Los cuatro enlaces no caben junto al logotipo en un telefono, asi
            que ahi se pliegan detras del boton de menu. */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                LINK,
                isActive(pathname, href) ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              <Icon size={15} aria-hidden="true" className="opacity-70" />
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Cerrar el menú" : "Abrir el menú"}
            className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip flex size-11 shrink-0 items-center justify-center border transition-colors md:hidden"
          >
            {open ? (
              <X size={17} aria-hidden="true" />
            ) : (
              <Menu size={17} aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="menu-principal"
          className="border-line bg-bg border-t px-4 py-2 md:hidden"
        >
          <ul className="mx-auto flex max-w-[1480px] flex-col">
            {LINKS.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "rounded-chip flex h-12 items-center gap-2.5 px-3 text-[15px] transition-colors",
                    isActive(pathname, href)
                      ? "text-accent bg-accent-soft"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <Icon size={17} aria-hidden="true" className="opacity-70" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
