import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import type { Profile } from '@/mapping/types';
import { useAppStore } from '@/store';
import { useToast } from '@/store/toast';

interface Props {
  profile: Profile;
  onClose: () => void;
}

export function DeleteProfileModal({ profile, onClose }: Props) {
  const profiles = useAppStore((s) => s.profiles);
  const activeId = useAppStore((s) => s.settings.activeProfileId);
  const toast = useToast((s) => s.show);
  const isActive = profile.id === activeId;
  const others = profiles.filter((p) => p.id !== profile.id);
  const [replacement, setReplacement] = useState(others[0]?.id ?? '');

  const confirm = () => {
    const before = useAppStore.getState().profiles;
    const beforeActive = useAppStore.getState().settings.activeProfileId;
    const res = useAppStore.getState().deleteProfile(profile.id, isActive ? replacement : undefined);
    if (!res.ok) return;
    const next = useAppStore.getState().profiles.find((p) => p.id === (isActive ? replacement : beforeActive));
    toast({
      title: 'Profile deleted',
      message: isActive ? `${profile.name} is gone — ${next?.name} is live now.` : `${profile.name} is gone.`,
      undo: () => {
        useAppStore.getState().restoreProfiles(before);
        useAppStore.getState().setSetting('activeProfileId', beforeActive);
      },
    });
    onClose();
  };

  return (
    <Modal
      title="Delete this profile?"
      subtitle={`${profile.name} will be removed right away.`}
      icon="trash"
      tone="danger"
      width={480}
      onClose={onClose}
      footer={
        <>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" icon="trash" disabled={isActive && !replacement} onClick={confirm}>
            Delete profile
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-3 rounded-[12px] bg-surface-2 py-2.5 pl-3 pr-3.5">
          <span className="text-body-md">{profile.name}</span>
          <span className="h-px flex-1 bg-border-strong" />
          <span className="text-caption text-fg-secondary">
            {profile.mappings.length} mapping{profile.mappings.length === 1 ? '' : 's'}
          </span>
        </div>

        {isActive && others.length === 0 && (
          <div className="flex items-start gap-2 rounded-ctrl-lg border border-warning bg-warning-subtle px-3.5 py-3 text-caption text-fg-secondary">
            <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-warning" />
            This is your only profile — create another one before deleting it.
          </div>
        )}

        {isActive && others.length > 0 && (
          <div className="flex flex-col gap-2 rounded-ctrl-lg border border-warning bg-warning-subtle px-3.5 py-3">
            <span className="flex items-center gap-2 text-label text-warning">
              <Icon name="alert" size={14} />
              This is the active profile
            </span>
            <span className="text-caption text-fg-secondary">Choose the profile that takes over after the deletion.</span>
            <select
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              aria-label="Replacement profile"
              className="h-9 rounded-ctrl border border-border-strong bg-surface-2 px-3 text-body text-fg-primary outline-none focus:border-[1.5px] focus:border-accent"
            >
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.mappings.length} mappings
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-caption text-fg-muted">
          The mappings inside are deleted with the profile. Gestures used only here become free again in other profiles.
        </p>
      </div>
    </Modal>
  );
}
