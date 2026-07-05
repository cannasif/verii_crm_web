import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, PanelRightClose } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { requestAiAssistantWidgetPlacementResetOnShow } from '../lib/ai-assistant-widget-placement';

type AiAssistantWidgetToggleButtonProps = {
  className?: string;
  toolbarStyle?: boolean;
  buttonClassName?: string;
};

export function AiAssistantWidgetToggleButton({
  className,
  toolbarStyle = false,
  buttonClassName,
}: AiAssistantWidgetToggleButtonProps): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isAiAssistantWidgetVisible = useUIStore((state) => state.isAiAssistantWidgetVisible);
  const setAiAssistantWidgetVisible = useUIStore((state) => state.setAiAssistantWidgetVisible);
  const label = isAiAssistantWidgetVisible ? t('hideFloatingWidget') : t('showFloatingWidget');

  const handleHideWidget = (): void => {
    setAiAssistantWidgetVisible(false);
  };

  const handleShowWidget = (): void => {
    requestAiAssistantWidgetPlacementResetOnShow();
    setAiAssistantWidgetVisible(true);
    navigate('/');
  };

  const handleClick = (): void => {
    if (isAiAssistantWidgetVisible) {
      handleHideWidget();
      return;
    }

    setIsConfirmOpen(true);
  };

  const icon = isAiAssistantWidgetVisible ? <PanelRightClose size={15} className="me-1.5" /> : <MessageCircle size={15} className="me-1.5" />;

  return (
    <>
      {toolbarStyle ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClick}
          aria-label={label}
          title={label}
          className={cn(buttonClassName, className)}
        >
          {icon}
          {label}
        </Button>
      ) : (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleClick}
          aria-label={label}
          title={label}
          className={cn(
            'w-full rounded-2xl border border-white/20 bg-[image:var(--crm-brand-gradient)] text-xs font-black uppercase text-white opacity-85 shadow-[0_8px_18px_-14px_var(--crm-brand-shadow)] transition hover:bg-[image:var(--crm-brand-gradient)] hover:opacity-100 hover:shadow-[0_10px_22px_-12px_var(--crm-brand-shadow)]',
            className
          )}
        >
          {icon}
          {label}
        </Button>
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent
          overlayClassName="z-[70]"
          className="z-[70] rounded-[1.75rem] sm:rounded-[1.75rem]"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {t('showFloatingWidgetDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              {t('showFloatingWidgetDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl text-xs font-black"
              onClick={() => setIsConfirmOpen(false)}
            >
              {t('showFloatingWidgetDialogCancel')}
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-[image:var(--crm-brand-gradient)] text-xs font-black text-white hover:opacity-90"
              onClick={() => {
                setIsConfirmOpen(false);
                handleShowWidget();
              }}
            >
              {t('showFloatingWidgetDialogConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
