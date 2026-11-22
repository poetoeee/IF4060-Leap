import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Toggle } from '@/components/Toggle';
import { TEMPLATES, type MappingTemplate } from '@/mapping/templates';
import { useAppStore, validateProfileName, type ProfileSource } from '@/store';
import { useToast } from '@/store/toast';
import { TemplateGallery } from './TemplateGallery';
import { useProfileUi } from './uiStore';

/** Milestone 3 · frame 14 — name, source and "make it live" in one step. */
export function NewProfileModal() {
  const open = useProfileUi((s) => s.newProfileOpen);
  const close = useProfileUi((s) => s.closeNewProfile);
  const preset = useProfileUi((s) => s.presetTemplateId);
  const profiles = useAppStore((s) => s.profiles);
  const toast = useToast((s) => s.show);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [source, setSource] = useState<ProfileSource>({ kind: 'template', templateId: preset });
  const [activate, setActivate] = useState(true);
  const [touched, setTouched] = useState(false);

  // Reopening the modal starts fresh, with the template that was asked for.
  useEffect(() => {
    if (!open) return;
    setName('');
    setSource({ kind: 'template', templateId: preset });
    setActivate(true);
    setTouched(false);
  }, [open, preset]);

  if (!open) return null;

  const nameError = validateProfileName(name, profiles);
  const canCreate = !nameError;

  const pickTemplate = (t: MappingTemplate) => setSource({ kind: 'template', templateId: t.id });

  const closeAll = () => close();

  const create = () => {
    setTouched(true);
    if (nameError) return;
    const res = useAppStore.getState().createProfile({ name, source, activate });
    if (!res.ok) {
      setTouched(true);
      return;
    }
    const count = useAppStore.getState().profiles.find((p) => p.id === res.profileId)?.mappings.length ?? 0;
    toast({
      title: 'Profile created',
      message: `${name.trim()} is ready with ${count} mapping${count === 1 ? '' : 's'}.`,
    });
    closeAll();
    navigate(`/profiles/${res.profileId}`);
  };

  return (
    <Modal
      title="New profile"
      subtitle="Name it, pick where the mappings come from, and make it live."
      icon="plus"
      width={880}
      onClose={closeAll}
      footer={
        <>
          <span className="flex-1" />
          <Button variant="ghost" onClick={closeAll}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" disabled={!canCreate} title={nameError ?? undefined} onClick={create}>
            Create profile
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="new-profile-name" className="flex-1 text-label">
              Profile name
            </label>
            <span className="t-overline text-fg-muted">required</span>
          </div>
          <input
            id="new-profile-name"
            autoFocus
            value={name}
            maxLength={40}
            placeholder="e.g. Web Browsing"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreate) create();
            }}
            className={`h-9 rounded-ctrl border bg-surface-2 px-3 text-body text-fg-primary outline-none placeholder:text-fg-muted focus:border-[1.5px] focus:border-accent ${
              touched && nameError ? 'border-danger' : 'border-border-strong'
            }`}
          />
          {touched && nameError && (
            <span className="flex items-center gap-1.5 text-caption text-danger">
              <Icon name="alert" size={13} />
              {nameError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-label">Start from</span>
            <span className="t-overline text-fg-muted">ready-made templates</span>
          </div>
          <TemplateGallery selected={source.kind === 'template' ? source.templateId : ''} onSelect={pickTemplate} />
        </div>

        <div className="flex flex-col gap-2">
          <OptionRow
            icon="plus"
            title="Start with an empty profile"
            caption="No mappings — you add every gesture yourself."
            selected={source.kind === 'empty'}
            onSelect={() => setSource({ kind: 'empty' })}
          />
          <OptionRow
            icon="copy"
            title="Duplicate an existing profile"
            caption="Copy every mapping of a profile you already have."
            selected={source.kind === 'duplicate'}
            disabled={profiles.length === 0}
            onSelect={() => setSource({ kind: 'duplicate', profileId: profiles[0]?.id ?? '' })}
          />
          {source.kind === 'duplicate' && (
            <select
              value={source.profileId}
              onChange={(e) => setSource({ kind: 'duplicate', profileId: e.target.value })}
              aria-label="Profile to duplicate"
              className="h-9 rounded-ctrl border border-border-strong bg-surface-2 px-3 text-body text-fg-primary outline-none focus:border-[1.5px] focus:border-accent"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.mappings.length} mappings
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-ctrl-lg border bg-surface-2 px-3.5 py-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-label">Make it the active profile</span>
            <span className="text-caption text-fg-muted">GesturMap switches to it right away — no restart needed.</span>
          </div>
          <Toggle label="Make it the active profile" checked={activate} onChange={setActivate} />
        </div>

        {source.kind === 'template' && <TemplatePreview templateId={source.templateId} />}
      </div>
    </Modal>
  );
}

function OptionRow({
  icon,
  title,
  caption,
  selected,
  disabled,
  onSelect,
}: {
  icon: 'plus' | 'copy';
  title: string;
  caption: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-ctrl-lg border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? 'border-[1.5px] border-accent bg-accent-subtle' : 'border bg-surface-2 hover:border-border-strong'
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border bg-inset">
        <Icon name={icon} size={17} className={selected ? 'text-accent' : 'text-fg-secondary'} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-md">{title}</span>
        <span className="text-caption text-fg-muted">{caption}</span>
      </span>
      {selected && <Icon name="check" size={15} className="text-accent" />}
    </button>
  );
}

/** Shows every gesture the chosen template covers (read-only preview). */
function TemplatePreview({ templateId }: { templateId: string }) {
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return null;
  return (
    <div className="flex flex-col gap-2 rounded-ctrl-lg border bg-inset p-3.5">
      <div className="flex items-center gap-2">
        <span className="t-overline text-accent">{tpl.name} · {tpl.mappings.length} mappings</span>
        <span className="flex-1" />
        <span className="t-overline text-fg-muted">read-only</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tpl.mappings.map((mm) => (
          <span key={mm.id} className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 py-1 pl-1.5 pr-2.5">
            <GestureGlyph gesture={mm.gesture} size={16} />
            <span className="text-caption text-fg-secondary">{mm.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
