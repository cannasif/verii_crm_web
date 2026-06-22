import { type ReactElement, useEffect, useState } from 'react';
import { Bot, Database, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const stepIconClassName = [
  'bg-pink-500/15 text-pink-600 dark:text-pink-200',
  'bg-sky-500/15 text-sky-600 dark:text-sky-200',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-200',
];

const StepIcon = [Bot, Database, Sparkles];

export function AiAssistantThinkingIndicator(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveStepIndex((currentIndex) => (currentIndex + 1) % 3);
    }, 900);

    return () => window.clearInterval(intervalId);
  }, []);

  const steps = [
    t('thinking.steps.1'),
    t('thinking.steps.2'),
    t('thinking.steps.3'),
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-3xl border border-pink-500/20 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.48))] p-4 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(15,23,42,0.56))]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-pink-600 dark:text-pink-300">
            {t('thinking.title')}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {steps[activeStepIndex]}
          </p>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dotIndex) => (
            <span
              key={dotIndex}
              className="h-2 w-2 animate-bounce rounded-full bg-pink-500"
              style={{ animationDelay: `${dotIndex * 120}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {steps.map((step, index) => {
          const Icon = StepIcon[index];
          const isActive = index === activeStepIndex;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2 transition ${
                isActive
                  ? 'border-pink-500/30 bg-white/80 text-slate-950 shadow-sm dark:bg-white/10 dark:text-white'
                  : 'border-transparent bg-white/35 text-slate-500 dark:bg-white/5 dark:text-slate-400'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${stepIconClassName[index]}`}
              >
                <Icon size={16} />
              </span>
              <span className="text-xs font-bold leading-5">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
