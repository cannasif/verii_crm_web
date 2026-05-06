import { useLayoutEffect, useRef, useState } from 'react';
import { FileText, MoreHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DescriptionCellProps {
  content: string;
  colWidth?: number;
}

export function DescriptionCell({ content, colWidth }: DescriptionCellProps) {
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
    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden w-full">
      <FileText size={14} className="text-slate-400 shrink-0" />
      <span ref={textRef} className="truncate min-w-0 flex-1 text-slate-600 dark:text-slate-300">
        {content}
      </span>
      {isOverflowing && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
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
                <FileText size={14} className="text-pink-500" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Açıklama Detayı
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
