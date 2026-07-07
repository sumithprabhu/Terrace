import Link from "next/link"
import Image from "next/image"
import { Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.png" alt="Terrace logo" width={22} height={22} />
          <span className="text-base font-medium text-foreground">Terrace</span>
        </Link>

        <Link
          href="https://github.com/sumithprabhu/Terrace"
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <Github className="h-4 w-4" />
        </Link>
      </div>
    </footer>
  )
}
