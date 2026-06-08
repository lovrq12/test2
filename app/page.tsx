import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import { HeroSection } from "@/components/hero-section"
import { MafiaBanner } from "@/components/mafia-banner"
import { RecommendedSection } from "@/components/recommended-section"
import { MobileHeader } from "@/components/mobile-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-5 p-3 pb-24 sm:p-4 lg:p-6 lg:pb-6">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <MobileHeader />
        <TopNav />

        {/* Hero — preserves 16:9 artwork */}
        <div className="aspect-[16/9] sm:aspect-[2/1] lg:aspect-[21/8]">
          <HeroSection />
        </div>

        {/* Mafia banner — preserves wide artwork */}
        <div className="aspect-[16/10] sm:aspect-[16/7] lg:aspect-[64/15]">
          <MafiaBanner />
        </div>

        <RecommendedSection />
      </div>

      <MobileBottomNav />
    </main>
  )
}
