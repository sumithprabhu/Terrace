export function PageBanner({ title }: { title: string }) {
  return (
    <div className="px-4 pt-28 md:px-6 md:pt-32">
      <div className="relative mx-auto h-56 w-full max-w-6xl overflow-hidden rounded-2xl border border-border md:h-72">
        <img src="/images/hero-bg.png" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">{title}</h1>
        </div>
      </div>
    </div>
  )
}
