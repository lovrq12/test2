import {
  Home,
  Gamepad2,
  Users,
  Newspaper,
  LibraryBig,
  Star,
  Skull,
  ShoppingBag,
  LayoutGrid,
  Crown,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Item = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
}

const mainItems: Item[] = [
  { label: "الصفحة الرئيسية", icon: Home, active: true },
  { label: "الألعاب", icon: Gamepad2 },
  { label: "المجتمع", icon: Users },
  { label: "الأخبار", icon: Newspaper },
  { label: "المكتبة", icon: LibraryBig },
  { label: "المفضلة", icon: Star },
]

const exploreItems: Item[] = [
  { label: "مافيا", icon: Skull },
  { label: "متجر", icon: ShoppingBag },
  { label: "تصنيف", icon: LayoutGrid },
  { label: "المفضلة", icon: Crown },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-6 rounded-3xl border border-border bg-card/60 p-4 backdrop-blur-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 pt-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-neon-purple">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-bold tracking-wide text-foreground">
          NIGHTMARES HUB
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1">
        {mainItems.map((item) => (
          <SidebarLink key={item.label} item={item} />
        ))}
      </nav>

      <div className="flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        استكشاف
        <span className="h-px flex-1 bg-border" />
      </div>

      <nav className="flex flex-col gap-1">
        {exploreItems.map((item) => (
          <SidebarLink key={item.label} item={item} />
        ))}
      </nav>
    </aside>
  )
}

function SidebarLink({ item }: { item: Item }) {
  const Icon = item.icon
  return (
    <a
      href="#"
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
        item.active
          ? "sidebar-item-active border border-primary/40 bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          item.active ? "text-neon-purple" : "text-muted-foreground group-hover:text-neon-purple",
        )}
      />
      <span>{item.label}</span>
    </a>
  )
}
