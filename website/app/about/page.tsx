import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PageBanner } from "@/components/page-banner"

export const metadata: Metadata = {
  title: "About Terrace"
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <PageBanner title="About Terrace" />

        <div className="mx-auto w-full max-w-2xl px-6 pb-20 pt-14">
          <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
            <p>
              Terrace is a live chat room for football fans. It exists to make watching a match with your
              friends more fun, even when everyone is somewhere else. Predicting the score is a fun bonus on
              top, bragging rights included, not the main event.
            </p>
            <p>
              Every match already has a room the moment the fixture exists. Nobody creates one and nobody
              owns it. You just open the app, pick a match, and you are in the same room as everyone else
              who picked that match, talking directly to each other.
            </p>
            <p>
              Every room opens 12 hours before kickoff and stays live for 6 hours after, so you can talk
              before the game and keep the conversation going once the final whistle blows, not just during
              the 90 minutes.
            </p>
            <p>
              The current score is crowd sourced. Anyone in the room can report it as the match happens, and
              if people disagree for a moment, the room settles on whichever version most people are
              currently reporting. Once the match ends, the leaderboard ranks everyone by how close their
              prediction was.
            </p>
            <p>
              Terrace has no database and no backend to shut down. Every device keeps its own copy of the
              room, found and synced directly with peers. See the{" "}
              <a href="/how-it-works" className="text-foreground underline underline-offset-4">
                how it works
              </a>{" "}
              page for the details.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
