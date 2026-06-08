import { Spade } from "lucide-react"

export function MafiaBanner() {
  return (
    <section
      aria-label="بانر NIGHTMARES MAFIA"
      className="relative overflow-hidden rounded-3xl border border-neon-pink/25"
    >
      <img
        src="/assets/banners/nightmares-play-now.png"
        alt="NIGHTMARES MAFIA — خداع، تحالف، انتصر: طاولة بطاقات على شاطئ ليلي"
        className="h-full w-full object-cover object-center"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-background/70 via-transparent to-background/40" />

      {/* Play now button — bottom-left to mirror the reference */}
      <div className="absolute inset-x-0 bottom-0 flex justify-start p-5 sm:p-6 lg:p-8">
        <a
          href="/games/nightmares/index.html"
          className="btn-glow-pink inline-flex items-center gap-3 rounded-xl border border-neon-pink/60 bg-background/40 px-6 py-3 text-sm font-bold text-foreground backdrop-blur-sm transition-all sm:text-base"
        >
          <span>العب الآن</span>
          <Spade className="h-4 w-4 text-neon-pink" />
        </a>
      </div>
    </section>
  )
}
