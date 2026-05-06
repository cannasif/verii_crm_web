import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIStore } from '@/stores/ui-store';
import { CheckCircle2, MessageSquareText, ShoppingCart, Workflow } from 'lucide-react';

export function WhatsappFlowPage(): ReactElement {
  const { t } = useTranslation('whatsapp-integration');
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle(t('flow.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const steps = [
    { icon: MessageSquareText, title: t('flow.steps.inbound.title'), text: t('flow.steps.inbound.text') },
    { icon: Workflow, title: t('flow.steps.intent.title'), text: t('flow.steps.intent.text') },
    { icon: ShoppingCart, title: t('flow.steps.quote.title'), text: t('flow.steps.quote.text') },
    { icon: CheckCircle2, title: t('flow.steps.handoff.title'), text: t('flow.steps.handoff.text') },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('flow.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('flow.description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="rounded-2xl border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-600" />
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{step.text}</CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
        <CardHeader>
          <CardTitle>{t('flow.nextPhaseTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          {t('flow.nextPhaseText')}
        </CardContent>
      </Card>
    </div>
  );
}
