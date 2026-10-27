import type { ReactNode } from 'react';
import connectorOff from '@/assets/connector-off.svg';
import connectorOn from '@/assets/connector-on.svg';
import { Badge, type BadgeTone } from '@/components/Badge';
import { GestureGlyph } from '@/components/GestureGlyph';
import { IconButton } from '@/components/IconButton';
import { KeyCaps } from '@/components/KeyCap';
import { Toggle } from '@/components/Toggle';
import { actionCaps, actionKind, actionSummary } from '@/mapping/format';
import { GESTURE, HAND_LABEL } from '@/mapping/gestures';
import { DEFAULT_HOLD_MS } from '@/mapping/rules';
import type { GestureId, Hand, Mapping } from '@/mapping/types';
import { COL } from './layout';
import { SOURCE_BADGE } from './sourceBadge';

interface RowShellProps {
  gesture: GestureId;
  hand: Hand;
  holdMs?: number;
  caps: string[];
  label: string;
  kind: string;
  off?: boolean;
  highlight?: boolean;
  badge: { tone: BadgeTone; label: string; dot: boolean };
  children?: ReactNode;
}

export function RowShell({ gesture, hand, holdMs, caps, label, kind, off, highlight, badge, children }: RowShellProps) {
  const hold = holdMs && holdMs !== DEFAULT_HOLD_MS ? ` · hold ${holdMs / 1000}s` : '';
  return (
    <div className={`flex items-center gap-3 border-t py-2.5 pl-5 pr-4 transition-colors duration-700 ${highlight ? 'bg-success-subtle' : ''}`}>
      <div className={`flex items-center gap-2.5 ${COL.gesture}`}>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-[11px] border ${off ? 'bg-inset' : 'bg-surface-2'}`}>
          <GestureGlyph gesture={gesture} size={26} className={off ? 'opacity-50' : ''} />
        </span>
        <div className={`flex flex-col gap-0.5 whitespace-nowrap ${off ? 'text-fg-muted' : ''}`}>
          <span className="text-body-md">{GESTURE[gesture].name}</span>
          <span className="t-overline text-fg-muted">
            {HAND_LABEL[hand]}
            {hold}
          </span>
        </div>
      </div>
      <div className={`flex items-center ${COL.link}`}>
        <img src={off ? connectorOff : connectorOn} width={56} height={10} alt="" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <KeyCaps caps={caps} dim={off} />
        <div className={`flex min-w-0 flex-col gap-0.5 whitespace-nowrap ${off ? 'text-fg-muted' : ''}`}>
          <span className="truncate text-small">{label}</span>
          <span className="t-overline text-fg-muted">{kind}</span>
        </div>
      </div>
      <div className={COL.source}>
        <Badge {...badge} />
      </div>
      {children}
    </div>
  );
}

interface MappingRowProps {
  m: Mapping;
  highlight: boolean;
  revertible: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRevert: () => void;
  onDelete: () => void;
}

export function MappingRow({ m, highlight, revertible, onToggle, onEdit, onRevert, onDelete }: MappingRowProps) {
  const name = GESTURE[m.gesture].name;
  return (
    <RowShell
      gesture={m.gesture}
      hand={m.hand}
      holdMs={m.holdMs}
      caps={actionCaps(m.action)}
      label={m.label ?? actionSummary(m.action)}
      kind={actionKind(m.action)}
      off={!m.enabled}
      highlight={highlight}
      badge={SOURCE_BADGE[m.source]}
    >
      <div className={COL.on}>
        <Toggle label={`${name} enabled`} checked={m.enabled} onChange={onToggle} />
      </div>
      <div className={`flex items-center justify-end gap-1.5 ${COL.actions}`}>
        <IconButton icon="pencil" label={`Edit ${name}`} onClick={onEdit} />
        <IconButton icon="revert" label="Revert to template" tone="warning" onClick={onRevert} className={revertible ? '' : 'invisible'} />
        <IconButton icon="trash" label={`Delete ${name}`} tone="danger" onClick={onDelete} />
      </div>
    </RowShell>
  );
}
