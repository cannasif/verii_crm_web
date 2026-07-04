import { type ReactElement, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  BookOpen,
  CircleCheckBig,
  Eye,
  FileSearch,
  ShieldCheck,
  Target,
  TriangleAlert,
  Users2,
  Workflow,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type GuideCard = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
};

type GuideScenario = {
  id: string;
  title: string;
  target: string;
  steps: string[];
  result: string;
};

type GuideFaq = {
  id: string;
  question: string;
  answer: string;
};

function readStringList(t: TFunction, key: string): string[] {
  const v = t(key, { returnObjects: true });
  return Array.isArray(v) && v.every((item) => typeof item === 'string') ? (v as string[]) : [];
}

function readGuidePageCards(t: TFunction): GuideCard[] {
  const v = t('guide.pageCards', { returnObjects: true });
  if (!Array.isArray(v)) {
    return [];
  }
  const out: GuideCard[] = [];
  for (const item of v) {
    if (item === null || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const bulletsRaw = o.bullets;
    const bullets =
      Array.isArray(bulletsRaw) && bulletsRaw.every((b) => typeof b === 'string')
        ? (bulletsRaw as string[])
        : [];
    const id = typeof o.id === 'string' ? o.id : '';
    if (!id) {
      continue;
    }
    out.push({
      id,
      title: typeof o.title === 'string' ? o.title : '',
      summary: typeof o.summary === 'string' ? o.summary : '',
      bullets,
    });
  }
  return out;
}

function readGuideScenarios(t: TFunction): GuideScenario[] {
  const v = t('guide.scenarios', { returnObjects: true });
  if (!Array.isArray(v)) {
    return [];
  }
  const out: GuideScenario[] = [];
  for (const item of v) {
    if (item === null || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const stepsRaw = o.steps;
    const steps =
      Array.isArray(stepsRaw) && stepsRaw.every((s) => typeof s === 'string') ? (stepsRaw as string[]) : [];
    const id = typeof o.id === 'string' ? o.id : '';
    if (!id) {
      continue;
    }
    out.push({
      id,
      title: typeof o.title === 'string' ? o.title : '',
      target: typeof o.target === 'string' ? o.target : '',
      steps,
      result: typeof o.result === 'string' ? o.result : '',
    });
  }
  return out;
}

function readGuideFaqs(t: TFunction): GuideFaq[] {
  const v = t('guide.faqs', { returnObjects: true });
  if (!Array.isArray(v)) {
    return [];
  }
  const out: GuideFaq[] = [];
  for (const item of v) {
    if (item === null || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : '';
    if (!id) {
      continue;
    }
    out.push({
      id,
      question: typeof o.question === 'string' ? o.question : '',
      answer: typeof o.answer === 'string' ? o.answer : '',
    });
  }
  return out;
}

function SummaryBlock({
  icon,
  title,
  items,
}: {
  icon: ReactElement;
  title: string;
  items: string[];
}): ReactElement {
  return (
    <Card className="rounded-[2rem] border border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#180F22]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg font-black text-slate-900 dark:text-white">
          <span className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]"
          >
            <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span className="text-slate-700 dark:text-slate-200">{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AccessControlGuidePage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();

  const pageTitle = t('guide.title');
  useEffect(() => {
    setPageTitle(pageTitle);
    return () => setPageTitle(null);
  }, [pageTitle, setPageTitle]);

  const quickRules = useMemo(() => readStringList(t, 'guide.quickRules'), [t]);
  const pageCards = useMemo(() => readGuidePageCards(t), [t]);
  const scenarios = useMemo(() => readGuideScenarios(t), [t]);
  const mistakes = useMemo(() => readStringList(t, 'guide.mistakes'), [t]);
  const checklist = useMemo(() => readStringList(t, 'guide.checklist'), [t]);
  const faqs = useMemo(() => readGuideFaqs(t), [t]);

  return (
    <div className="w-full space-y-6">
      <Breadcrumb
        items={[
          { label: t('sidebar.accessControl') },
          { label: t('sidebar.accessControlGuide'), isActive: true },
        ]}
      />

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-xl dark:border-white/10 dark:bg-[#180F22]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10 dark:text-primary">
              <BookOpen className="size-3.5" />
              {t('common:guide')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {pageTitle}
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {t('guide.description')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {t('guide.hero.coreLogicLabel')}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                {t('guide.hero.coreLogicValue')}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {t('guide.hero.finalCheckLabel')}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                {t('guide.hero.finalCheckValue')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SummaryBlock
        icon={<ShieldCheck className="size-5" />}
        title={t('guide.quickRulesTitle')}
        items={quickRules}
      />

      <Card className="rounded-[2rem] border border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Workflow className="size-5 text-amber-500" />
            {t('guide.screensTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {pageCards.map((card, index) => (
              <AccordionItem
                key={card.id}
                value={card.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 px-0 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-4 pr-4">
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span className="text-base font-black text-slate-900 dark:text-white">{card.title}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{card.summary}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="space-y-3">
                    {card.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-[#130822]"
                      >
                        <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        <span className="text-slate-700 dark:text-slate-200">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Target className="size-5 text-cyan-500" />
            {t('guide.scenariosTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {scenarios.map((scenario, index) => (
            <Card
              key={scenario.id}
              className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white">{scenario.title}</CardTitle>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{scenario.target}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {scenario.steps.map((step, stepIndex) => (
                    <div
                      key={`${scenario.id}-${stepIndex}`}
                      className="flex gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-[#130822]"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white dark:bg-white dark:text-slate-900">
                        {stepIndex + 1}
                      </div>
                      <span className="text-slate-700 dark:text-slate-200">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                    {t('guide.expectedResultLabel')}
                  </div>
                  <p className="mt-2 text-emerald-900 dark:text-emerald-100">{scenario.result}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SummaryBlock icon={<TriangleAlert className="size-5" />} title={t('guide.mistakesTitle')} items={mistakes} />
        <SummaryBlock icon={<Eye className="size-5" />} title={t('guide.checklistTitle')} items={checklist} />
      </div>

      <Card className="rounded-[2rem] border border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Users2 className="size-5 text-violet-500" />
            {t('guide.faqTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 px-0 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <AccordionTrigger className="px-5 py-4 text-left text-sm font-black text-slate-900 hover:no-underline dark:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10">
        <CardContent className="flex gap-4 p-6">
          <FileSearch className="mt-1 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <div className="text-sm font-black text-amber-900 dark:text-amber-100">{t('guide.footer.title')}</div>
            <p className="mt-2 text-sm leading-6 text-amber-900/90 dark:text-amber-100/90">{t('guide.footer.body')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
