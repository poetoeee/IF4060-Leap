import { useState, type ReactNode } from 'react';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';
import { MAX_SCROLL_LINES } from '@/mapping/rules';
import type { Action } from '@/mapping/types';
import { KeyRecorder } from './KeyRecorder';

type ActionType = Action['type'];

const ACTION_TYPES: SegmentOption<ActionType>[] = [
  { value: 'key', label: 'Key', icon: 'keyboard' },
  { value: 'combo', label: 'Combo', icon: 'keyboard' },
  { value: 'click', label: 'Click', icon: 'mouse-click' },
  { value: 'scroll', label: 'Scroll', icon: 'move' },
];

/** Draft state the editor keeps while the user switches between action types. */
interface Draft {
  type: ActionType;
  key: string[];
  combo: string[];
  button: 'left' | 'right';
  direction: 'up' | 'down';
  amount: number;
  repeat: boolean;
}

const draftOf = (a: Action): Draft => ({
  type: a.type,
  key: a.type === 'key' ? [a.key] : [],
  combo: a.type === 'combo' ? a.keys : [],
  button: a.type === 'click' ? a.button : 'left',
  direction: a.type === 'scroll' ? a.direction : 'up',
  amount: a.type === 'scroll' ? a.amount : 3,
  repeat: a.type === 'scroll' && !!a.repeat,
});

const toAction = (d: Draft): Action =>
  d.type === 'key'
    ? { type: 'key', key: d.key[0] ?? '' }
    : d.type === 'combo'
      ? { type: 'combo', keys: d.combo }
      : d.type === 'click'
        ? { type: 'click', button: d.button }
        : { type: 'scroll', direction: d.direction, amount: d.amount, ...(d.repeat && { repeat: true }) };

interface Props {
  /** Action the editor starts with; changing it later does not reset the draft. */
  initial: Action;
  /** Called with the action after every change. */
  onChange: (a: Action) => void;
  /** Hides the "hold to repeat" option — it only makes sense for scroll gestures. */
  allowRepeat?: boolean;
}

/** The action half of the mapping editor. */
export function ActionEditor({ initial, onChange, allowRepeat = true }: Props) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(toAction(next));
  };

  return (
    <>
      <Field label="Action type">
        <SegmentedControl label="Action type" value={draft.type} onChange={(t) => update({ type: t })} options={ACTION_TYPES} />
      </Field>

      {draft.type === 'key' && (
        <Field label="Key">
          <KeyRecorder mode="key" keys={draft.key} onChange={(keys) => update({ key: keys })} />
        </Field>
      )}
      {draft.type === 'combo' && (
        <Field label="Key combination" hint="up to 3 keys">
          <KeyRecorder mode="combo" keys={draft.combo} onChange={(keys) => update({ combo: keys })} />
        </Field>
      )}
      {draft.type === 'click' && (
        <Field label="Button">
          <SegmentedControl
            label="Mouse button"
            value={draft.button}
            onChange={(button) => update({ button })}
            options={[
              { value: 'left', label: 'Left click' },
              { value: 'right', label: 'Right click' },
            ]}
          />
        </Field>
      )}
      {draft.type === 'scroll' && (
        <>
          <Field label="Direction">
            <SegmentedControl
              label="Scroll direction"
              value={draft.direction}
              onChange={(direction) => update({ direction })}
              options={[
                { value: 'up', label: '↑ Up' },
                { value: 'down', label: '↓ Down' },
              ]}
            />
          </Field>
          <Field label="Scroll speed" hint="per gesture">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={MAX_SCROLL_LINES}
                value={draft.amount}
                onChange={(e) => update({ amount: Number(e.target.value) })}
                className="flex-1 accent-accent"
                aria-label="Scroll lines"
              />
              <span className="w-16 text-right font-mono text-key">{draft.amount} lines</span>
            </div>
          </Field>
          {allowRepeat && (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-label">Keep scrolling while hand is held up</span>
                <span className="text-caption text-fg-muted">Like holding the scroll wheel</span>
              </div>
              <Toggle label="Keep scrolling while hand is held up" checked={draft.repeat} onChange={(repeat) => update({ repeat })} />
            </div>
          )}
        </>
      )}
    </>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-label">{label}</span>
        {hint && <span className="t-overline text-fg-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
