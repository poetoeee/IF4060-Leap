import type { GestureId } from '@/mapping/types';

const urls = import.meta.glob<string>('../assets/glyphs/*.svg', { eager: true, import: 'default', query: '?url' });

interface GestureGlyphProps {
  gesture: GestureId;
  size?: number;
  className?: string;
}

export function GestureGlyph({ gesture, size = 32, className = '' }: GestureGlyphProps) {
  return (
    <img
      src={urls[`../assets/glyphs/${gesture}.svg`]}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className={`shrink-0 ${className}`}
    />
  );
}
