import { type ReactElement } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function VoiceSearchButton({
  onResult,
  className,
  size = 'icon',
  variant = 'ghost',
}: VoiceSearchButtonProps): ReactElement {
  const { t } = useTranslation();
  const { isListening, error, isSupported, startListening, stopListening } = useVoiceSearch({
    onResult: (text) => {
      onResult(text);
      if (text.trim()) {
        toast.success(t('common.voiceSearchCompleted'));
      }
    },
  });

  const handleClick = (): void => {
    if (!isSupported) {
      toast.error(t('common.voiceSearchNotSupported'));
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (error) {
    toast.error(error);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        'shrink-0',
        isListening && 'animate-pulse bg-primary text-primary-foreground',
        className
      )}
      disabled={!isSupported}
      title={isListening ? t('common.voiceSearchStopListening') : t('common.voiceSearch')}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
