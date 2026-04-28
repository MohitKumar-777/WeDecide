'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

interface Props {
  value: number;
  format?: (val: number) => string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedCounter({ value, format = (v) => Math.round(v).toString(), duration = 0.5, className = '', style }: Props) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Determine direction for flash effect
    if (value > prevValue.current) {
      setFlashColor('var(--yes)'); // Green for increase
    } else if (value < prevValue.current) {
      setFlashColor('var(--no)'); // Red for decrease
    }

    // Clear flash after 300ms
    const timer = setTimeout(() => setFlashColor(null), 300);

    // Animate the number counting up/down smoothly
    const controls = animate(prevValue.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate(v) {
        node.textContent = format(v);
      },
    });

    prevValue.current = value;

    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [value, duration, format]);

  return (
    <span
      ref={nodeRef}
      className={className}
      style={{
        ...style,
        color: flashColor || style?.color, // Flash color overrides text color briefly
        textShadow: flashColor ? `0 0 12px ${flashColor}` : 'none',
        background: flashColor ? `${flashColor}15` : 'transparent',
        padding: flashColor ? '2px 6px' : '2px 0px',
        borderRadius: '6px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth fade out
      }}
    >
      {format(value)}
    </span>
  );
}
