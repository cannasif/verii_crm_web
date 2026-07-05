import { type ReactElement, type ReactNode, useEffect, useState } from 'react';

type AiAssistantAnswerCardProps = {
  title?: string;
  answer: string;
  headerAction?: ReactNode;
};

export function AiAssistantAnswerCard({ title, answer, headerAction }: AiAssistantAnswerCardProps): ReactElement {
  const [visibleAnswer, setVisibleAnswer] = useState('');

  useEffect(() => {
    setVisibleAnswer('');

    const chunkSize = Math.max(1, Math.ceil(answer.length / 72));
    const intervalId = window.setInterval(() => {
      setVisibleAnswer((currentValue) => {
        if (currentValue.length >= answer.length) {
          window.clearInterval(intervalId);
          return answer;
        }

        return answer.slice(0, currentValue.length + chunkSize);
      });
    }, 18);

    return () => window.clearInterval(intervalId);
  }, [answer]);

  const isStreaming = visibleAnswer.length < answer.length;

  return (
    <div className="rounded-[1.6rem] rounded-ss-md border border-slate-200/80 bg-white/85 p-4 text-sm font-semibold leading-6 text-slate-800 shadow-sm shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-100">
      {(title || headerAction) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {title ? (
            <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-primary">
              {title}
            </div>
          ) : (
            <span />
          )}
          {headerAction}
        </div>
      )}
      <span>{visibleAnswer}</span>
      {isStreaming && (
        <span
          aria-hidden="true"
          className="ms-1 inline-block h-4 w-1 animate-pulse rounded-full bg-primary align-middle"
        />
      )}
    </div>
  );
}
