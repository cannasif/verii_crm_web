import { type ReactElement, useEffect, useState } from 'react';

type AiAssistantAnswerCardProps = {
  title: string;
  answer: string;
};

export function AiAssistantAnswerCard({ title, answer }: AiAssistantAnswerCardProps): ReactElement {
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
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-950 dark:text-emerald-100">
      <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
        {title}
      </div>
      <span>{visibleAnswer}</span>
      {isStreaming && (
        <span
          aria-hidden="true"
          className="ms-1 inline-block h-4 w-1 animate-pulse rounded-full bg-emerald-600 align-middle dark:bg-emerald-300"
        />
      )}
    </div>
  );
}
