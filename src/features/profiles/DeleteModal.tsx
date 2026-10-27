import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { KeyCaps } from '@/components/KeyCap';
import { Modal } from '@/components/Modal';
import { actionCaps, actionSummary } from '@/mapping/format';
import { GESTURE } from '@/mapping/gestures';
import type { Mapping } from '@/mapping/types';
import { SOURCE_BADGE } from './sourceBadge';

interface Props {
  mapping: Mapping;
  profileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ mapping, profileName, onCancel, onConfirm }: Props) {
  const name = GESTURE[mapping.gesture].name;
  return (
    <Modal
      title="Delete this mapping?"
      subtitle={`It will be removed from ${profileName} right away.`}
      icon="trash"
      tone="danger"
      width={460}
      onClose={onCancel}
      footer={
        <>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" icon="trash" onClick={onConfirm}>
            Delete mapping
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-3 rounded-[12px] bg-surface-2 py-2.5 pl-3 pr-3.5">
          <GestureGlyph gesture={mapping.gesture} size={28} />
          <span className="text-body-md">{name}</span>
          <span className="h-[1.5px] w-6 bg-accent" />
          <KeyCaps caps={actionCaps(mapping.action)} />
          <span className="min-w-0 flex-1 truncate text-caption text-fg-secondary">{mapping.label ?? actionSummary(mapping.action)}</span>
          <Badge {...SOURCE_BADGE[mapping.source]} />
        </div>
        <p className="text-caption text-fg-muted">{name} becomes a free gesture again — you can map it later.</p>
      </div>
    </Modal>
  );
}
