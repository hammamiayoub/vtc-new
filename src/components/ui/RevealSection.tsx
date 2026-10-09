import React, { useLayoutEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type RevealSectionProps = React.ComponentPropsWithoutRef<'section'>;

/** Fades a section in when it enters the viewport. Content stays visible if motion is reduced. */
export const RevealSection: React.FC<RevealSectionProps> = ({ className = '', children, ...rest }) => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    let frame = 0;
    const check = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= vh * 0.9 && rect.bottom >= 48) {
        setVisible(true);
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [visible]);

  const motionClass = visible ? 'reveal-section is-visible' : 'reveal-section';

  return (
    <section ref={ref} className={`${motionClass} ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
};
