import { Home, Gamepad2, ShoppingBag, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { label: "الرئيسية", icon: Home, active: true },
  { label: "الألعاب", icon: Gamepad2 },
  { label: "المتجر", icon: ShoppingBag },
  { label: "البروفايل", icon: UserRound },
]

export function MobileBottomNav() {
  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.label} className="flex-1">
              <a
                href="#"
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                  item.active
                    ? "sidebar-item-active border border-primary/40 bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    item.active ? "text-neon-purple" : "text-muted-foreground",
                  )}
                />
                <span>{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
