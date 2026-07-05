import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type AiAssistantDockDialogProps = {
  open: boolean;
  sidebarEnabled: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sidebarEnabled: boolean) => void;
};

export function AiAssistantDockDialog({
  open,
  sidebarEnabled,
  onOpenChange,
  onConfirm,
}: AiAssistantDockDialogProps): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const [isSidebarEnabled, setIsSidebarEnabled] = useState(sidebarEnabled);

  useEffect(() => {
    if (open) {
      setIsSidebarEnabled(sidebarEnabled);
    }
  }, [open, sidebarEnabled]);

  const handleConfirm = (): void => {
    onConfirm(isSidebarEnabled);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[70]"
        className="z-[70] rounded-[1.75rem] sm:rounded-[1.75rem]"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-black">{t('dockDialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="ai-assistant-sidebar-link" className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('sidebarLinkLabel')}
            </Label>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('sidebarLinkDescription')}</p>
          </div>
          <Switch
            id="ai-assistant-sidebar-link"
            checked={isSidebarEnabled}
            onCheckedChange={setIsSidebarEnabled}
          />
        </div>

        {isSidebarEnabled ? (
          <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-950 dark:text-amber-100">
            {t('sidebarLinkEnabledNotice')}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl text-xs font-black"
            onClick={() => onOpenChange(false)}
          >
            {t('dockDialogCancel')}
          </Button>
          <Button
            type="button"
            className="rounded-2xl bg-[image:var(--crm-brand-gradient)] text-xs font-black text-white hover:opacity-90"
            onClick={handleConfirm}
          >
            {t('dockDialogConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
