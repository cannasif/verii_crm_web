import { type ReactElement, useEffect, useState } from 'react';
import { Bot, Database, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const stepIconClassName = [
  'bg-primary/12 text-primary dark:bg-primary/15 dark:text-primary',
  'bg-primary/10 text-primary/90 dark:bg-primary/12 dark:text-primary',
  'bg-accent text-primary dark:bg-primary/10 dark:text-primary',
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
      className="rounded-3xl border border-primary/15 bg-accent/40 p-4 shadow-sm dark:border-primary/20 dark:bg-primary/8"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-primary">
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
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
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
                  ? 'border-primary/25 bg-white/80 text-slate-950 shadow-sm dark:bg-primary/10 dark:text-white'
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
