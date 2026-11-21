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

/**
 * Key mode: focus, then press a single key.
 * Combo mode: no timer — accumulates keys across presses until the user clicks Done, or Clear to start over.
 */
export function KeyRecorder({ mode, keys, onChange }: KeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && mode === 'key') return; // keep keyboard navigation
    e.preventDefault();
    if (e.repeat) return;
    if (!recording) return;
    const k = normalizeKey(e.key);
    if (mode === 'key') {
      if (!isModifier(k)) onChange([k]);
      return;
    }
    if (!keys.includes(k) && keys.length < MAX_COMBO_KEYS) {
      onChange(sortKeys([...keys, k]));
    }
  };

  const finishCombo = () => {
    setRecording(false);
    boxRef.current?.blur();
  };

  const clearKeys = () => {
    onChange([]);
    setRecording(true);
    boxRef.current?.focus();
  };

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="textbox"
      aria-label={mode === 'key' ? 'Key — focus and press a key' : 'Key combination — press keys then click Done'}
      onFocus={() => setRecording(true)}
      onBlur={() => {
        if (mode === 'key') setRecording(false);
      }}
      onClick={() => {
        if (!recording) {
          setRecording(true);
          boxRef.current?.focus();
        }
      }}
      onKeyDown={onKeyDown}
      className={`flex h-[46px] cursor-text items-center gap-2 rounded-ctrl-lg bg-inset pl-3 pr-1.5 outline-none ${
        recording ? 'border-[1.5px] border-accent' : 'border hover:border-border-strong'
      }`}
    >
      <StatusDot tone={recording ? 'accent' : 'muted'} />
      {keys.length ? <KeyCaps caps={keys.map(keyLabel)} /> : <span className="text-small text-fg-muted">No key yet</span>}
      <span className="flex-1" />
      <span className="t-overline whitespace-nowrap text-fg-muted">
        {recording ? (mode === 'combo' ? 'press keys, then done…' : 'press a key…') : 'click to record'}
      </span>
      {mode === 'combo' && recording && (
        <button
          type="button"
          className="h-9 rounded-ctrl bg-accent px-3.5 text-label text-fg-on-accent hover:bg-accent-hover disabled:opacity-40"
          disabled={keys.length < 2}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            finishCombo();
          }}
        >
          Done
        </button>
      )}
      <button
        type="button"
        className="h-9 rounded-ctrl px-3.5 text-label text-fg-secondary hover:bg-surface-2 disabled:opacity-40"
        disabled={!keys.length}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          clearKeys();
        }}
      >
        Clear
      </button>
    </div>
  );
}
