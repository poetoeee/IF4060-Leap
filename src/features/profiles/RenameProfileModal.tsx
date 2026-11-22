import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import type { Profile } from '@/mapping/types';
import { useAppStore, validateProfileName } from '@/store';
import { useToast } from '@/store/toast';

interface Props {
  profile: Profile;
  onClose: () => void;
}

export function RenameProfileModal({ profile, onClose }: Props) {
  const profiles = useAppStore((s) => s.profiles);
  const toast = useToast((s) => s.show);
  const [name, setName] = useState(profile.name);
  const [touched, setTouched] = useState(false);

  const error = validateProfileName(name, profiles, profile.id);
  const canSave = !error;

  const save = () => {
    setTouched(true);
    if (error) return;
    const res = useAppStore.getState().renameProfile(profile.id, name);
    if (!res.ok) return;
    toast({ title: 'Profile renamed', message: `Now called ${name.trim()}.` });
    onClose();
  };

  return (
    <Modal
      title="Rename profile"
      subtitle={`${profile.mappings.length} mappings stay exactly as they are.`}
      icon="pencil"
      width={460}
      onClose={onClose}
      footer={
        <>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" disabled={!canSave} title={error ?? undefined} onClick={save}>
            Save name
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="rename-profile-name" className="text-label">
          Profile name
        </label>
        <input
          id="rename-profile-name"
          autoFocus
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) save();
          }}
          className={`h-9 rounded-ctrl border bg-surface-2 px-3 text-body text-fg-primary outline-none focus:border-[1.5px] focus:border-accent ${
            touched && error ? 'border-danger' : 'border-border-strong'
          }`}
        />
        {touched && error && (
          <span className="flex items-center gap-1.5 text-caption text-danger">
            <Icon name="alert" size={13} />
            {error}
          </span>
        )}
      </div>
    </Modal>
  );
}
