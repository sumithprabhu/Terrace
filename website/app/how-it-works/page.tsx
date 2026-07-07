import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MeshAnimation } from "@/components/mesh-animation"
import { PageBanner } from "@/components/page-banner"

export const metadata: Metadata = {
  title: "How Terrace works"
}

const FEATURES = [
  {
    icon: <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />,
    text: "Chat live, react, reply, and mention people in the room."
  },
  {
    icon: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />,
    text: "Predict the score before kickoff, just for fun. It locks in the moment the match starts."
  },
  {
    icon: <path d="M16 7h6v6M22 7l-8.5 8.5-5-5L2 17" />,
    text: "Watch the score update live as people call it in."
  },
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    text: "Every room opens 12 hours before kickoff and stays live for 6 hours after, so the chat does not end with the final whistle."
  },
  {
    icon: <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978M18 9h1.5a1 1 0 0 0 0-5H18M4 22h16M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM6 9H4.5a1 1 0 0 1 0-5H6" />,
    text: "See the leaderboard settle once the match ends."
  }
]

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <PageBanner title="How Terrace works" />

        <div className="mx-auto w-full max-w-5xl px-6 pb-20 pt-14">
          <p className="mb-12 max-w-2xl text-lg text-muted-foreground">
            Terrace is a chat room built for watching football with your friends. No accounts, no servers,
            no middlemen, just you and everyone else in the room, talking straight to each other.
          </p>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What you can do
              </h2>
              <ul className="mb-10 space-y-4">
                {FEATURES.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3 text-foreground">
                    <svg
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {feature.icon}
                    </svg>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Under the hood
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Built on <strong className="text-foreground">Hyperswarm</strong> and{" "}
                <strong className="text-foreground">Hypercore</strong>, the same peer to peer tech behind
                Keet and other Holepunch apps. Every device keeps its own copy of the room, found and
                synced directly with peers over a public DHT. There is no database, no backend, and
                nothing to shut off.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8">
              <MeshAnimation />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Everyone connects straight to each other. No server in the middle to go down, get hacked,
                or shut off.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
