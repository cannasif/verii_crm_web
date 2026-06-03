import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MoreHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DescriptionCellProps {
  content: string;
  colWidth?: number;
  hideIcon?: boolean;
  icon?: React.ReactNode;
  popoverHeader?: string;
  className?: string;
  textClassName?: string;
}

export function DescriptionCell({
  content,
  colWidth,
  hideIcon = false,
  icon,
  popoverHeader,
  className,
  textClassName,
}: DescriptionCellProps) {
  const { t } = useTranslation('common');
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const span = textRef.current;
    if (!span) return;

    const raf = requestAnimationFrame(() => {
      setIsOverflowing(span.scrollWidth > span.clientWidth);
    });
    return () => cancelAnimationFrame(raf);
  }, [colWidth, content]);

  if (!content) return <span className="text-muted-foreground">-</span>;

  return (
    <div className={`flex items-center gap-1.5 min-w-0 overflow-hidden w-full ${className || ''}`}>
      {!hideIcon && (icon || <FileText size={14} className="text-slate-400 shrink-0" />)}
      <span
        ref={textRef}
        className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap ${textClassName || 'text-slate-600 dark:text-slate-300'}`}
        style={{ textOverflow: isOverflowing ? 'clip' : 'ellipsis' }}
      >
        {content}
      </span>
      {isOverflowing && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-skip-row-double-click="true"
              data-no-drag-scroll="true"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="p-1 h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-pink-500 transition-colors shrink-0"
            >
              <MoreHorizontal size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-4 shadow-2xl border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                {icon || <FileText size={14} className="text-pink-500" />}
                <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  {popoverHeader || t('common.descriptionDetail')}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {content}
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
