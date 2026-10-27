import live from '@/assets/led-live.svg';
import idle from '@/assets/led-idle.svg';

export function LedMark({ state = 'live', className = '' }: { state?: 'live' | 'idle'; className?: string }) {
  return <img src={state === 'live' ? live : idle} width={44} height={22} alt="" className={`shrink-0 ${className}`} />;
}
