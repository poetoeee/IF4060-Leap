import { useRef, useState, type KeyboardEvent } from 'react';
import { KeyCaps } from '@/components/KeyCap';
import { StatusDot } from '@/components/StatusDot';
import { isModifier, keyLabel, normalizeKey, sortKeys } from '@/mapping/format';
import { MAX_COMBO_KEYS } from '@/mapping/rules';

interface KeyRecorderProps {
  mode: 'key' | 'combo';
  keys: string[];
  onChange: (keys: string[]) => void;
}

/** Focus, then press a key (or hold a chord for combos). Captured keys never reach the page. */
export function KeyRecorder({ mode, keys, onChange }: KeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const held = useRef(new Set<string>());
  const chord = useRef<string[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && mode === 'key') return; // keep keyboard navigation
    e.preventDefault();
    if (e.repeat) return;
    const k = normalizeKey(e.key);
    if (mode === 'key') {
      if (!isModifier(k)) onChange([k]);
      return;
    }
    if (held.current.size === 0) chord.current = [];
    held.current.add(k);
    if (!chord.current.includes(k) && chord.current.length < MAX_COMBO_KEYS) chord.current.push(k);
    onChange(sortKeys(chord.current));
  };

  return (
    <div
      tabIndex={0}
      role="textbox"
      aria-label={mode === 'key' ? 'Key — focus and press a key' : 'Key combination — focus and press up to 3 keys'}
      onFocus={() => setRecording(true)}
      onBlur={() => {
        setRecording(false);
        held.current.clear();
      }}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => held.current.delete(normalizeKey(e.key))}
      className={`flex h-[46px] cursor-text items-center gap-2 rounded-ctrl-lg bg-inset pl-3 pr-1.5 outline-none ${
        recording ? 'border-[1.5px] border-accent' : 'border hover:border-border-strong'
      }`}
    >
      <StatusDot tone={recording ? 'accent' : 'muted'} />
      {keys.length ? <KeyCaps caps={keys.map(keyLabel)} /> : <span className="text-small text-fg-muted">No key yet</span>}
      <span className="flex-1" />
      <span className="t-overline whitespace-nowrap text-fg-muted">{recording ? 'press a key…' : 'click to record'}</span>
      <button
        type="button"
        className="h-9 rounded-ctrl px-3.5 text-label text-fg-secondary hover:bg-surface-2 disabled:opacity-40"
        disabled={!keys.length}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange([])}
      >
        Clear
      </button>
    </div>
  );
}
