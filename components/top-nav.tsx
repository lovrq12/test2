import { UserRound } from "lucide-react"

const navLinks = ["الرئيسية", "الألعاب", "الأخبار", "الدعم"]

export function TopNav() {
  return (
    <header className="hidden lg:flex items-center justify-between rounded-2xl border border-border bg-card/50 px-5 py-3 backdrop-blur-sm">
      <nav className="flex items-center gap-7 text-sm">
        {navLinks.map((link, i) => (
          <a
            key={link}
            href="#"
            className={
              i === 0
                ? "relative font-semibold text-foreground after:absolute after:-bottom-2 after:right-0 after:h-0.5 after:w-full after:rounded-full after:bg-neon-purple after:shadow-[0_0_10px_var(--neon-purple)]"
                : "text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {link}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <a
          href="#"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          تسجيل الدخول
        </a>
        <a
          href="#"
          className="btn-glow-pink rounded-full border border-neon-pink/50 bg-neon-pink/10 px-4 py-2 text-sm font-semibold text-foreground transition-all"
        >
          إنشاء حساب
        </a>
        <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
          <UserRound className="h-5 w-5" />
        </span>
      </div>
    </header>
  )
}
