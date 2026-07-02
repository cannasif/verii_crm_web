import { type ReactElement } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOCUMENT_PAGE_NAV_BUTTON_CLASS } from '@/lib/document-line-dialog-styles';
import { cn } from '@/lib/utils';

interface DocumentBackButtonProps {
  onBack: () => void;
  backLabel: string;
  className?: string;
}

export function DocumentBackButton({
  onBack,
  backLabel,
  className,
}: DocumentBackButtonProps): ReactElement {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onBack}
      title={backLabel}
      aria-label={backLabel}
      className={cn(DOCUMENT_PAGE_NAV_BUTTON_CLASS, className)}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
