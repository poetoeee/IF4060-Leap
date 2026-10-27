import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { KeyCaps } from '@/components/KeyCap';
import { Modal } from '@/components/Modal';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { actionCaps, actionSummary } from '@/mapping/format';
import { GESTURE, GESTURES, HAND_LABEL } from '@/mapping/gestures';
import { canRevert, freeGestures, handBlocks, HANDS, templateCounterpart, validateMapping } from '@/mapping/rules';
import { TEMPLATE } from '@/mapping/seed';
import type { Action, GestureId, Hand, Mapping, Profile } from '@/mapping/types';
import { KeyRecorder } from './KeyRecorder';
import { SOURCE_BADGE } from './sourceBadge';

export type MappingModalMode = { kind: 'add'; gesture?: GestureId } | { kind: 'edit'; mapping: Mapping };

interface Props {
  profile: Profile;
  mode: MappingModalMode;
  onClose: () => void;
  onSave: (m: Mapping) => string | null;
  onRevert: (m: Mapping) => void;
}

type ActionType = Action['type'];

const ACTION_TYPES: SegmentOption<ActionType>[] = [
  { value: 'key', label: 'Key', icon: 'keyboard' },
  { value: 'combo', label: 'Combo', icon: 'keyboard' },
  { value: 'click', label: 'Click', icon: 'mouse-click' },
  { value: 'scroll', label: 'Scroll', icon: 'move' },
];

const HAND_NAME: Record<Hand, string> = { right: 'Right', left: 'Left', any: 'Any' };

function firstFreeHand(p: Profile, g: GestureId, ignoreId?: string): Hand {
  const blocks = handBlocks(p, g, ignoreId);
  return HANDS.find((h) => !blocks[h]) ?? 'right';
}

export function MappingModal({ profile, mode, onClose, onSave, onRevert }: Props) {
  const editing = mode.kind === 'edit' ? mode.mapping : null;
  const free = useMemo(() => freeGestures(profile), [profile]);
  const initialGesture = editing?.gesture ?? (mode.kind === 'add' ? mode.gesture : undefined) ?? free[0] ?? 'swipe_up';
  const init = editing?.action;

  const [gesture, setGesture] = useState<GestureId>(initialGesture);
  const [hand, setHand] = useState<Hand>(editing?.hand ?? firstFreeHand(profile, initialGesture));
  const [type, setType] = useState<ActionType>(init?.type ?? 'key');
  const [key, setKey] = useState<string[]>(init?.type === 'key' ? [init.key] : []);
  const [combo, setCombo] = useState<string[]>(init?.type === 'combo' ? init.keys : []);
  const [button, setButton] = useState<'left' | 'right'>(init?.type === 'click' ? init.button : 'left');
  const [direction, setDirection] = useState<'up' | 'down'>(init?.type === 'scroll' ? init.direction : 'up');
  const [amount, setAmount] = useState(init?.type === 'scroll' ? init.amount : 3);
  const [label, setLabel] = useState(editing?.label ?? '');
  const [error, setError] = useState<string | null>(null);

  const action: Action =
    type === 'key'
      ? { type, key: key[0] ?? '' }
      : type === 'combo'
        ? { type, keys: combo }
        : type === 'click'
          ? { type, button }
          : { type, direction, amount };

  const draft: Mapping = {
    id: editing?.id ?? 'draft',
    gesture,
    hand,
    holdMs: editing?.holdMs,
    action,
    label: label.trim() || undefined,
    enabled: editing?.enabled ?? true,
    source: editing?.source ?? 'custom',
  };
  const invalid = validateMapping(profile, draft);
  const blocks = handBlocks(profile, gesture, editing?.id);
  const tpl = editing ? templateCounterpart(TEMPLATE, editing) : undefined;

  const pickGesture = (g: GestureId) => {
    setGesture(g);
    if (handBlocks(profile, g)[hand]) setHand(firstFreeHand(profile, g));
  };

  const save = () => setError(onSave(draft));

  return (
    <Modal
      title={editing ? 'Edit mapping' : 'Add mapping'}
      subtitle={editing ? `${profile.name} · ${GESTURE[gesture].name}` : 'Pick a free gesture, choose what it sends, then save.'}
      icon={editing ? 'pencil' : 'plus'}
      width={editing ? 580 : 900}
      onClose={onClose}
      footer={
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {error || invalid ? (
              <span className={`text-caption ${error ? 'text-danger' : 'text-fg-muted'}`}>{error ?? invalid}</span>
            ) : editing ? (
              canRevert(TEMPLATE, editing) && (
                <Button variant="ghost" icon="revert" onClick={() => onRevert(editing)}>
                  Revert to template
                </Button>
              )
            ) : (
              <>
                <Icon name="info" size={14} className="text-fg-muted" />
                <span className="text-caption text-fg-muted">Applies instantly — no restart.</span>
              </>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" disabled={!!invalid} title={invalid ?? undefined} onClick={save}>
            {editing ? 'Save changes' : 'Save mapping'}
          </Button>
        </>
      }
    >
      <div className="flex gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          {editing ? (
            <>
              <div className="flex items-center gap-3 rounded-[12px] bg-surface-2 py-2.5 pl-3 pr-3.5">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-inset">
                  <GestureGlyph gesture={gesture} size={26} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body-md">{GESTURE[gesture].name}</span>
                  <span className="t-overline text-fg-muted">{HAND_LABEL[hand]} · gesture locked while editing</span>
                </div>
                <Badge {...SOURCE_BADGE[editing.source]} />
              </div>
              {tpl && editing.source !== 'custom' && (
                <div className="flex items-start gap-2.5 rounded-ctrl-lg bg-warning-subtle px-3 py-2.5 text-caption text-warning">
                  <Icon name="revert" size={14} className="mt-px" />
                  <span>
                    Template default: {actionSummary(tpl.action)}.{' '}
                    {editing.source === 'template' ? 'Saving a different action marks it as Edited — you can revert anytime.' : 'You can revert to it anytime.'}
                  </span>
                </div>
              )}
            </>
          ) : (
            <Field label="Gesture" hint={`${free.length} free · fixed set`}>
              <div className="grid grid-cols-3 gap-2">
                {GESTURES.map((g) => {
                  const selected = g.id === gesture;
                  const locked = !free.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={locked}
                      onClick={() => pickGesture(g.id)}
                      title={!g.available ? 'Needs Leap Motion · soon' : locked ? 'Already mapped' : undefined}
                      className={`flex h-[46px] items-center gap-2 rounded-ctrl-lg pl-2 pr-2.5 text-left text-label transition-colors ${
                        selected
                          ? 'border-[1.5px] border-accent bg-accent-subtle text-fg-primary'
                          : locked
                            ? 'cursor-not-allowed border bg-inset text-fg-muted'
                            : 'border bg-surface-2 text-fg-primary hover:border-border-strong'
                      }`}
                    >
                      <GestureGlyph gesture={g.id} size={26} className={locked ? 'opacity-50' : ''} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{g.name}</span>
                        {!g.available && <span className="t-overline text-[10px] text-fg-muted">leap · soon</span>}
                      </span>
                      {selected ? <Icon name="check" size={14} className="text-accent" /> : locked && <Icon name="lock" size={13} />}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {!editing && (
            <Field label="Hand">
              <SegmentedControl
                label="Hand"
                value={hand}
                onChange={setHand}
                options={HANDS.map((h) => ({ value: h, label: HAND_NAME[h], disabled: !!blocks[h] }))}
              />
              {(blocks.left === 'reserved' || Object.values(blocks).includes('taken')) && (
                <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                  <Icon name="lock" size={12} />
                  {blocks.left === 'reserved'
                    ? 'Left-hand Open Palm is reserved for pausing gestures.'
                    : `Greyed-out hands already have ${GESTURE[gesture].name} in this profile.`}
                </span>
              )}
            </Field>
          )}

          <Field label="Action type">
            <SegmentedControl label="Action type" value={type} onChange={setType} options={ACTION_TYPES} />
          </Field>

          {type === 'key' && (
            <Field label="Key">
              <KeyRecorder mode="key" keys={key} onChange={setKey} />
            </Field>
          )}
          {type === 'combo' && (
            <Field label="Key combination" hint="up to 3 keys">
              <KeyRecorder mode="combo" keys={combo} onChange={setCombo} />
            </Field>
          )}
          {type === 'click' && (
            <Field label="Button">
              <SegmentedControl
                label="Mouse button"
                value={button}
                onChange={setButton}
                options={[
                  { value: 'left', label: 'Left click' },
                  { value: 'right', label: 'Right click' },
                ]}
              />
            </Field>
          )}
          {type === 'scroll' && (
            <>
              <Field label="Direction">
                <SegmentedControl
                  label="Scroll direction"
                  value={direction}
                  onChange={setDirection}
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
                    max={10}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="flex-1 accent-accent"
                    aria-label="Scroll lines"
                  />
                  <span className="w-16 text-right font-mono text-key">{amount} lines</span>
                </div>
              </Field>
            </>
          )}

          <Field label="Label (optional)">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={actionSummary(action)}
              maxLength={40}
              className="h-9 rounded-ctrl border bg-surface-2 px-3 text-body text-fg-primary outline-none placeholder:text-fg-muted focus:border-[1.5px] focus:border-accent"
            />
          </Field>
        </div>

        {!editing && <HowTo gesture={gesture} hand={hand} caps={actionCaps(action)} />}
      </div>
    </Modal>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

function HowTo({ gesture, hand, caps }: { gesture: GestureId; hand: Hand; caps: string[] }) {
  return (
    <aside className="flex w-[326px] shrink-0 flex-col gap-3.5 self-start rounded-card border bg-inset p-4">
      <span className="t-overline text-accent">how to do it</span>
      <div className="stage-bg relative flex h-[200px] items-center justify-center overflow-hidden rounded-ctrl-lg border">
        <GestureGlyph gesture={gesture} size={80} />
        <span className="t-overline absolute bottom-3 left-3 text-fg-muted">{HAND_LABEL[hand]}</span>
      </div>
      <p className="text-small text-fg-secondary">{GESTURE[gesture].howTo}</p>
      <div className="flex items-center gap-2 border-t pt-3.5">
        <span className="t-overline flex-1 text-fg-muted">sends</span>
        {caps.some(Boolean) ? <KeyCaps caps={caps} /> : <span className="text-caption text-fg-muted">—</span>}
      </div>
    </aside>
  );
}
