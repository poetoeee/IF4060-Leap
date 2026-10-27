export type IconName =
  | 'alert' | 'camera' | 'check' | 'chevron-down' | 'chevron-right' | 'copy' | 'cpu' | 'dashboard'
  | 'download' | 'eye' | 'gamepad' | 'globe' | 'hand' | 'info' | 'keyboard' | 'layers' | 'lock'
  | 'mouse-click' | 'move' | 'pencil' | 'plug' | 'plus' | 'power' | 'presentation' | 'refresh'
  | 'revert' | 'search' | 'template' | 'trash' | 'x';

const urls = import.meta.glob<string>('../assets/icons/*.svg', { eager: true, import: 'default', query: '?url' });

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Figma icons are single-colour strokes; rendered as a mask so colour follows `currentColor`. */
export function Icon({ name, size = 18, className = '' }: IconProps) {
  const mask = `url("${urls[`../assets/icons/${name}.svg`]}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ width: size, height: size, mask, WebkitMask: mask }}
    />
  );
}
