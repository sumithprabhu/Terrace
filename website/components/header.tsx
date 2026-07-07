"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "How it works", href: "/how-it-works" }
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-background/80 px-6 py-3 backdrop-blur-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex cursor-pointer items-center gap-2">
            <Image src="/favicon.png" alt="Terrace logo" width={26} height={26} />
            <span className="text-lg font-medium tracking-tight text-foreground">Terrace</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button className="text-foreground transition-colors duration-300 md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <nav className="mt-6 flex flex-col gap-4 border-t border-border pb-2 pt-6 md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
