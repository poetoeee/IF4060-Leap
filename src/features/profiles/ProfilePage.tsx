import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { actionCaps, actionKind } from '@/mapping/format';
import { GESTURE, GESTURES } from '@/mapping/gestures';
import { canRevert, freeGestures, mappedGestures } from '@/mapping/rules';
import { TEMPLATE, TEMPLATE_PREVIEW } from '@/mapping/seed';
import type { Mapping, Profile } from '@/mapping/types';
import { useAppStore, useProfiles } from '@/store';
import { useToast } from '@/store/toast';
import { DeleteModal } from './DeleteModal';
import { COL } from './layout';
import { MappingModal, type MappingModalMode } from './MappingModal';
import { MappingRow, RowShell } from './MappingRow';

type Dialog = MappingModalMode | { kind: 'delete'; mapping: Mapping } | null;

export function ProfilePage() {
  const { id } = useParams();
  const profile = useProfiles().find((p) => p.id === id);
  const activeId = useAppStore((s) => s.settings.activeProfileId);
  const store = useAppStore.getState;
  const toast = useToast((s) => s.show);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(t);
  }, [highlight]);

  if (!profile) return <Navigate to="/" replace />;
  const isTemplate = profile.kind === 'template';
  const live = profile.id === activeId;
  const pid = profile.id;

  /** Runs a store change and offers Undo back to the profiles before it. */
  const withUndo = (title: string, message: string, change: () => void) => {
    const before = store().profiles;
    change();
    toast({ title, message, undo: () => store().restoreProfiles(before) });
  };

  const save = (m: Mapping): string | null => {
    const before = store().profiles;
    const res = dialog?.kind === 'edit' ? store().updateMapping(pid, m) : store().addMapping(pid, m);
    if (!res.ok) return res.error;
    const saved = store().profiles.find((p) => p.id === pid)?.mappings.find((x) => x.gesture === m.gesture && x.hand === m.hand);
    setDialog(null);
    setHighlight(saved?.id ?? null);
    toast({
      title: 'Mapping saved',
      message: `${GESTURE[m.gesture].name} → ${actionCaps(m.action).join(' + ')} works now. No restart needed.`,
      undo: () => store().restoreProfiles(before),
    });
    return null;
  };

  const revert = (m: Mapping) => {
    setDialog(null);
    withUndo('Reverted to template', `${GESTURE[m.gesture].name} uses the template action again.`, () => store().revertMapping(pid, m.id));
    setHighlight(m.id);
  };

  return (
    <div className="flex min-h-screen flex-col gap-[18px] px-8 py-7">
      <Header profile={profile} live={live} onActivate={() => store().setSetting('activeProfileId', pid)} onAdd={() => setDialog({ kind: 'add' })} />

      <section className="overflow-hidden rounded-card border bg-surface">
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex flex-1 flex-col gap-0.5">
            <h3 className="text-h3">{isTemplate ? 'Template mappings' : 'Profile mappings'}</h3>
            <span className="text-caption text-fg-muted">
              {isTemplate
                ? `${profile.mappings.length} of 9 gestures mapped · ${TEMPLATE_PREVIEW.length} need Leap`
                : `${mappedGestures(profile).size} of 9 gestures mapped`}
            </span>
          </div>
          <Coverage profile={profile} />
        </div>

        <div className="flex items-center gap-3 border-t bg-surface-2 py-2 pl-5 pr-4">
          <span className={`t-overline text-fg-muted ${COL.gesture}`}>gesture</span>
          <span className={COL.link} />
          <span className="t-overline flex-1 text-fg-muted">sends</span>
          <span className={`t-overline text-fg-muted ${COL.source}`}>source</span>
          {!isTemplate && (
            <>
              <span className={`t-overline text-fg-muted ${COL.on}`}>on</span>
              <span className={COL.actions} />
            </>
          )}
        </div>

        {profile.mappings.map((m) =>
          isTemplate ? (
            <RowShell
              key={m.id}
              gesture={m.gesture}
              hand={m.hand}
              caps={actionCaps(m.action)}
              label={m.label ?? ''}
              kind={actionKind(m.action)}
              badge={{ tone: 'neutral', label: 'Template', dot: false }}
            />
          ) : (
            <MappingRow
              key={m.id}
              m={m}
              highlight={highlight === m.id}
              revertible={canRevert(TEMPLATE, m)}
              onToggle={() => store().toggleMapping(pid, m.id)}
              onEdit={() => setDialog({ kind: 'edit', mapping: m })}
              onRevert={() => revert(m)}
              onDelete={() => setDialog({ kind: 'delete', mapping: m })}
            />
          ),
        )}
        {isTemplate &&
          TEMPLATE_PREVIEW.map((r) => (
            <RowShell key={r.gesture} {...r} off badge={{ tone: 'neutral', label: 'Leap · soon', dot: false }} />
          ))}

        <Footer profile={profile} onQuickAdd={(g) => setDialog({ kind: 'add', gesture: g })} />
      </section>

      {dialog && dialog.kind !== 'delete' && (
        <MappingModal profile={profile} mode={dialog} onClose={() => setDialog(null)} onSave={save} onRevert={revert} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteModal
          mapping={dialog.mapping}
          profileName={profile.name}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const m = dialog.mapping;
            setDialog(null);
            withUndo('Mapping deleted', `${GESTURE[m.gesture].name} is free again.`, () => store().removeMapping(pid, m.id));
          }}
        />
      )}
    </div>
  );
}

function Header({ profile, live, onActivate, onAdd }: { profile: Profile; live: boolean; onActivate: () => void; onAdd: () => void }) {
  const isTemplate = profile.kind === 'template';
  return (
    <header className="flex items-end gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="t-overline text-fg-muted">mappings / {profile.name}</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-h1">{profile.name}</h1>
          {live && <Badge tone="success" label="Live" />}
          {isTemplate ? (
            <>
              <Badge tone="neutral" label="Base template" dot={false} />
              <Badge tone="neutral" label="Read-only" dot={false} />
            </>
          ) : (
            <Badge tone="accent" label="Custom profile" dot={false} />
          )}
        </div>
        <p className="text-body text-fg-secondary">{profile.description}</p>
      </div>
      {!isTemplate && !live && (
        <Button variant="ghost" icon="check" onClick={onActivate}>
          Set as active
        </Button>
      )}
      {!isTemplate && (
        <Button variant="primary" icon="plus" onClick={onAdd}>
          Add mapping
        </Button>
      )}
    </header>
  );
}

function Coverage({ profile }: { profile: Profile }) {
  const mapped = mappedGestures(profile);
  if (profile.kind === 'template') TEMPLATE_PREVIEW.forEach((r) => mapped.add(r.gesture));
  return (
    <div className="flex items-center gap-1 rounded-ctrl-lg border bg-inset px-2 py-1.5" aria-label={`${mapped.size} of 9 gestures mapped`}>
      {GESTURES.map((g) => (
        <span
          key={g.id}
          title={g.name}
          className={`flex size-7 items-center justify-center rounded-[7px] ${mapped.has(g.id) ? 'bg-surface-2' : 'border border-dashed border-border-strong'}`}
        >
          <GestureGlyph gesture={g.id} size={20} className={mapped.has(g.id) ? '' : 'opacity-40'} />
        </span>
      ))}
    </div>
  );
}

function Footer({ profile, onQuickAdd }: { profile: Profile; onQuickAdd: (g: Mapping['gesture']) => void }) {
  if (profile.kind === 'template') {
    return (
      <div className="flex items-center gap-3 border-t bg-surface-2 px-5 py-3 text-caption text-fg-muted">
        <Icon name="lock" size={14} />
        The gesture set is fixed: 9 gestures, each can be mapped once per profile. New gestures can’t be added.
      </div>
    );
  }
  const free = freeGestures(profile).filter((g) => !mappedGestures(profile).has(g));
  return (
    <div className="flex items-center gap-3 border-t bg-surface-2 px-5 py-3">
      <Icon name="lock" size={14} className="text-fg-muted" />
      <span className="text-caption text-fg-muted">Free gestures</span>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {free.length === 0 && <span className="text-caption text-fg-muted">—</span>}
        {free.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onQuickAdd(g)}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-border-strong py-1 pl-1.5 pr-2.5 text-caption text-fg-secondary hover:border-accent"
          >
            <GestureGlyph gesture={g} size={18} />
            {GESTURE[g].name}
            <Icon name="plus" size={12} className="text-accent" />
          </button>
        ))}
      </div>
      <span className="t-overline text-fg-muted">fixed set · 9 gestures</span>
    </div>
  );
}
