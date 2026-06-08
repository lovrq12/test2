import { Gem, Sparkle } from "lucide-react"

export function HeroSection() {
  return (
    <section
      aria-label="إعلان VAULT 001 T"
      className="hero-glow relative overflow-hidden rounded-3xl border border-primary/30"
    >
      {/* Artwork: contains the luminous VAULT 001 T title + sword */}
      <img
        src="/assets/hero/vault-001t-hero.png"
        alt="VAULT 001 T — قريباً: فارس يقف أمام مملكة مظلمة تحت سماء مرصعة بالنجوم"
        className="h-full w-full object-cover object-center"
      />

      {/* readability gradient at the bottom */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />

      {/* Overlay: COMING SOON + actions, aligned under the title */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 p-6 pb-7 sm:pb-9 md:gap-7 lg:pb-12">
        <div className="flex items-center gap-3 text-neon-cyan">
          <Gem className="h-3.5 w-3.5" />
          <span className="font-display text-sm font-semibold tracking-[0.45em] sm:text-base neon-title">
            COMING SOON
          </span>
          <Gem className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4" dir="ltr">
          <a
            href="#"
            className="btn-glow-blue inline-flex items-center gap-2 rounded-xl border border-neon-blue/50 bg-neon-blue/15 px-5 py-3 font-display text-sm font-semibold tracking-wider text-foreground transition-all sm:px-7 sm:text-base"
          >
            <Gem className="h-4 w-4 text-neon-cyan" />
            LEARN MORE
          </a>
          <a
            href="#"
            className="btn-glow-pink inline-flex items-center gap-2 rounded-xl border border-neon-pink/50 bg-neon-pink/15 px-5 py-3 font-display text-sm font-semibold tracking-wider text-foreground transition-all sm:px-7 sm:text-base"
          >
            <Sparkle className="h-4 w-4 text-neon-pink" />
            JOIN UPDATES
          </a>
        </div>
      </div>
    </section>
  )
}
