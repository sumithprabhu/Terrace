"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatedText } from "./animated-text"
import { Button } from "./ui/button"

const RELEASES_URL = "https://github.com/sumithprabhu/Terrace/releases"

const SCREENSHOTS = [
  { src: "/images/app-screenshot-lobby.png", alt: "Terrace app showing the match list" },
  { src: "/images/app-screenshot-room.png", alt: "Terrace app showing a live match room" }
]

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeShot, setActiveShot] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveShot((i) => (i + 1) % SCREENSHOTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let rafId: number
    let currentProgress = 0

    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = 400
      const targetProgress = Math.min(scrollY / maxScroll, 1)

      const smoothUpdate = () => {
        currentProgress += (targetProgress - currentProgress) * 0.1

        if (Math.abs(targetProgress - currentProgress) > 0.001) {
          setScrollProgress(currentProgress)
          rafId = requestAnimationFrame(smoothUpdate)
        } else {
          setScrollProgress(targetProgress)
        }
      }

      cancelAnimationFrame(rafId)
      smoothUpdate()
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const easeOutQuad = (t: number) => t * (2 - t)
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  const scale = 1 - easeOutQuad(scrollProgress) * 0.15
  const borderRadius = easeOutCubic(scrollProgress) * 48
  const heightVh = 100 - easeOutQuad(scrollProgress) * 37.5

  return (
    <section className="pt-32 pb-12 px-6 min-h-screen flex items-center relative overflow-hidden">
      <div className="absolute inset-0 top-0">
        <div
          className="w-full will-change-transform overflow-hidden"
          style={{
            transform: `scale(${scale})`,
            borderRadius: `${borderRadius}px`,
            height: `${heightVh}vh`,
          }}
        >
          <img src="/images/hero-bg.png" alt="" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center mb-10">
          <div
            className={`transition-all duration-1000 delay-[800ms] ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
          >
            <h1 className="mb-6 w-full px-4 max-w-5xl mx-auto text-balance">
              <AnimatedText
                text="A live chat room for every match"
                delay={0.3}
                className="text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem] leading-tight"
              />
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground md:text-lg">
              Terrace is built for talking with your friends and fellow fans while the match happens.
              Predicting the score is just there for fun, bragging rights included. No accounts, no
              servers, just the room.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href={RELEASES_URL} target="_blank" rel="noreferrer">
                  Download for Windows
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={RELEASES_URL} target="_blank" rel="noreferrer">
                  macOS
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={RELEASES_URL} target="_blank" rel="noreferrer">
                  Linux
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          <div className="relative w-full flex justify-center">
            <div
              className={`relative w-full max-w-4xl aspect-[1932/1428] will-change-transform transition-all duration-[1500ms] ease-out delay-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[400px]"
              }`}
            >
              {SCREENSHOTS.map((shot, i) => (
                <img
                  key={shot.src}
                  src={shot.src}
                  alt={shot.alt}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl border border-border shadow-2xl transition-all duration-700 ease-out"
                  style={{
                    opacity: activeShot === i ? 1 : 0,
                    transform: activeShot === i ? "scale(1)" : "scale(1.03)"
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {SCREENSHOTS.map((shot, i) => (
              <button
                key={shot.src}
                type="button"
                aria-label={`Show screenshot ${i + 1}`}
                onClick={() => setActiveShot(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeShot === i ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
