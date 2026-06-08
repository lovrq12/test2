"use client"

import { Menu, Bell, UserRound, Sparkles, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const menuItems = [
  "الصفحة الرئيسية",
  "الألعاب",
  "المجتمع",
  "الأخبار",
  "المكتبة",
  "المفضلة",
  "مافيا",
  "متجر",
  "تصنيف",
]

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="lg:hidden">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          aria-label="فتح القائمة"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary/60 text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-neon-purple">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold tracking-wide text-foreground">
            NIGHTMARES HUB
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="الإشعارات"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/60 text-muted-foreground"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-neon-pink shadow-[0_0_8px_var(--neon-pink)]" />
          </button>
          <button
            type="button"
            aria-label="الحساب"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/60 text-muted-foreground"
          >
            <UserRound className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Slide-over menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <nav
          className={cn(
            "absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-2 border-l border-border bg-card p-5 transition-transform",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-base font-bold text-foreground">القائمة</span>
            <button
              type="button"
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-secondary/60 text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {menuItems.map((item, i) => (
            <a
              key={item}
              href="#"
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                i === 0
                  ? "sidebar-item-active border border-primary/40 bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
