import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { actionCaps } from '@/mapping/format';
import { TEMPLATES } from '@/mapping/templates';
import { useProfileUi } from './uiStore';

export function TemplateSection() {
  const openNewProfile = useProfileUi((s) => s.openNewProfile);
  return (
    <section className="flex flex-col gap-3.5 rounded-card border bg-surface px-5 pb-5 pt-[18px]">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-h3">Ready-made templates</h3>
        <span className="text-caption text-fg-muted">
          Start a profile from a set of mappings that already works — scrolling, browsing, presenting and more.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="flex flex-col gap-2.5 rounded-card border bg-surface-2 p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border bg-inset">
                <Icon name={t.icon} size={18} className="text-accent" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-body-md">{t.name}</span>
                  {t.recommended && <Badge tone="accent" label="Recommended" dot={false} />}
                </span>
                <span className="truncate text-caption text-fg-muted">{t.tagline}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-2">
              {t.mappings.slice(0, 4).map((mm) => (
                <div key={mm.id} className="flex items-center gap-2">
                  <GestureGlyph gesture={mm.gesture} size={16} />
                  <span className="min-w-0 flex-1 truncate text-caption text-fg-secondary">
                    {mm.label ?? actionCaps(mm.action).join(' + ')}
                  </span>
                </div>
              ))}
              {t.mappings.length > 4 && <span className="t-overline text-fg-muted">+{t.mappings.length - 4} more mappings</span>}
            </div>

            <Button variant="secondary" icon="plus" className="w-full" onClick={() => openNewProfile(t.id)}>
              Create profile from template
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
