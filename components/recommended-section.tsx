import { Diamond } from "lucide-react"

type CharacterCard = {
  title: string
  src: string
  alt: string
}

const characterCards: CharacterCard[] = [
  {
    title: "الكيميائي",
    src: "/assets/recommended/chemist-card.png",
    alt: "بطاقة الكيميائي — عالم متخصص في الجرعات النادرة برفقة غراب أسود",
  },
  {
    title: "الساحر الأسود",
    src: "/assets/recommended/dark-mage-card.png",
    alt: "بطاقة الساحر الأسود — Dark Mage محاط بطاقة بنفسجية أمام قلعة تحت القمر",
  },
  {
    title: "الشاعر",
    src: "/assets/recommended/poet-card.png",
    alt: "بطاقة الشاعر — من فئة المواطنين، شخصية مضيئة تحت سماء النجوم",
  },
]

export function RecommendedSection() {
  return (
    <section aria-label="تحديث الكروت الجديدة" className="flex flex-col gap-6">
      {/* Section title */}
      <div className="flex items-center justify-center gap-3 text-foreground">
        <Diamond className="h-3.5 w-3.5 text-neon-purple" />
        <h2 className="font-display text-xl font-bold tracking-wide sm:text-2xl">
          تحديث الكروت الجديدة
        </h2>
        <Diamond className="h-3.5 w-3.5 text-neon-purple" />
      </div>

      {/* Large update card — full composite, shown without distortion */}
      <article className="card-frame overflow-hidden rounded-2xl border border-primary/30">
        <img
          src="/assets/recommended/cards-update.png"
          alt="تحديث الكروت الجديدة — ثلاث شخصيات جديدة تنضم إلى الظلال: الكيميائي، الساحر الأسود، الشاعر"
          className="block h-auto w-full"
        />
      </article>

      {/* Three character cards — portrait art already includes its own title/frame */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {characterCards.map((card) => (
          <article
            key={card.title}
            className="card-frame overflow-hidden rounded-2xl border border-primary/25"
          >
            <img
              src={card.src || "/placeholder.svg"}
              alt={card.alt}
              className="block aspect-[3/4] w-full object-cover object-top"
            />
          </article>
        ))}
      </div>
    </section>
  )
}
