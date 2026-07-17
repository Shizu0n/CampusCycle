// Skeleton no formato do hang-tag: blocos sólidos de tinta a 8% + pulso de
// opacidade (sem shimmer — gradiente é proibido no DESIGN.md; reduced-motion
// desliga o pulso via CSS).
export function SkeletonCard() {
  return (
    <div className="hang-tag skeleton" aria-hidden="true">
      <div className="tag-media skeleton-block" />
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--meta" />
      <div className="tag-footer">
        <div className="skeleton-line skeleton-line--price" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <section className="feed-grid" aria-busy="true" aria-label="Carregando anúncios">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </section>
  );
}
