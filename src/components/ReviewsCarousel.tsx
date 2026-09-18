import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { fetchPublicReviews, type PublicReview } from '../utils/publicReviews';

function formatReviewDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} sur 5 étoiles`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export const ReviewsCarousel: React.FC = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicReviews(12).then((result) => {
      if (!cancelled) setReviews(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = reviews.length;
  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setActiveIndex(((index % total) + total) % total);
    },
    [total],
  );

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [total, isPaused]);

  if (total === 0) {
    return null;
  }

  const visible = [
    reviews[activeIndex],
    total > 1 ? reviews[(activeIndex + 1) % total] : null,
    total > 2 ? reviews[(activeIndex + 2) % total] : null,
  ].filter(Boolean) as PublicReview[];

  return (
    <section
      className="py-16 bg-white"
      aria-labelledby="reviews-carousel-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <h2 id="reviews-carousel-heading" className="page-heading mb-3">
              Ce que disent nos clients
            </h2>
            <p className="page-subheading">
              Avis vérifiés après chaque course terminée sur TuniDrive
            </p>
          </div>
          {total > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                aria-label="Avis précédent"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                aria-label="Avis suivant"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((review, i) => (
            <article
              key={`${review.clientInitial}-${review.createdAt}-${i}`}
              className={`uber-card p-6 flex flex-col h-full transition-opacity duration-300 ${
                i === 0 ? 'opacity-100' : 'opacity-90'
              }`}
            >
              <Quote size={22} className="text-gray-300 mb-4 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed flex-1 mb-5">
                &ldquo;{review.comment}&rdquo;
              </p>
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{review.clientInitial}</p>
                  <p className="text-xs text-gray-500">{review.city}</p>
                </div>
                <div className="text-right">
                  <StarRating rating={review.rating} />
                  {formatReviewDate(review.createdAt) && (
                    <p className="text-xs text-gray-400 mt-1">{formatReviewDate(review.createdAt)}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {total > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {reviews.map((review, index) => (
              <button
                key={`dot-${review.createdAt}-${index}`}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'w-6 bg-gray-900' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Aller à l'avis ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
