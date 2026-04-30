import { type ReactElement, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  title: string;
  summary: string;
  bullets: string[];
};

type GuideScenario = {
  title: string;
  target: string;
  steps: string[];
  result: string;
};

type GuideFaq = {
  question: string;
  answer: string;
};

type GuideCopy = {
  title: string;
  description: string;
  quickRules: string[];
  pageCards: GuideCard[];
  scenarios: GuideScenario[];
  mistakes: string[];
  checklist: string[];
  faqs: GuideFaq[];
};

const GUIDE_COPY: Record<'tr' | 'en', GuideCopy> = {
  tr: {
    title: 'Erisim Kontrolu Rehberi',
    description:
      'Bu rehber, erisim kontrolu altindaki tum ekranlarin ne ise yaradigini ve hangi ayarin ne sonuc urettigini tek bir yerde aciklar. Amac, sistem mantigini ilk kez goren bir kullanicinin bile ne yapmasi gerektigini net anlamasidir.',
    quickRules: [
      'Sayfa izni ayri, kayit gorunurlugu ayri konudur. Bir kullanici sayfaya girebilir ama tum kayitlari goremeyebilir.',
      'Permission Group ekrani kullanicinin hangi sayfayi acabilecegini ve hangi islemi yapabilecegini belirler.',
      'Visibility Policy ekrani kullanicinin o sayfadaki hangi kayitlari gorecegini belirler.',
      'User Group Assignments grup atar. User Visibility Assignments ise kullanici bazli gorunurluk istisnasi tanimlar.',
      'Visibility Simulator sonucu okumadan canliya kural vermek risklidir. Simulatorden sonucu mutlaka kontrol et.',
    ],
    pageCards: [
      {
        title: 'Permission Groups',
        summary:
          'Bu ekran kullanicinin hangi modulleri gorup hangi aksiyonlari yapabilecegini belirler.',
        bullets: [
          'Teklifler ekranini acsin istiyorsan `sales.quotations.view` gibi goruntuleme izni vermelisin.',
          'Yeni teklif olustursun istiyorsan ayni grupta `sales.quotations.create` izni de olmali.',
          'Guncellesin istiyorsan `sales.quotations.update`, silsin istiyorsan `sales.quotations.delete` gerekir.',
          'Buradaki izinler sayfa ve aksiyon kapisini acar; hangi kayitlari gorecegini tek basina belirlemez.',
        ],
      },
      {
        title: 'User Group Assignments',
        summary:
          'Bu ekran bir kullaniciya bir veya birden fazla permission group baglamak icin kullanilir.',
        bullets: [
          'Kullanici secilir, sonra o kullanicinin sahip olacagi gruplar secilir.',
          'Kullanici birden fazla gruptaysa izinler birlesir; yani bir grupta olan yetki diger grubu da destekler.',
          'Bir kullaniciya yanlis grup verirsen, hic tanimlamadigin sayfalara da erisim acabilirsin.',
          'Bu ekran en cok rol dagitimi icin kullanilir: satis temsilcisi, yonetici, operasyon, sistem yoneticisi gibi.',
        ],
      },
      {
        title: 'Visibility Policies',
        summary:
          'Bu ekran teklif, aktivite, talep, siparis gibi kayitlarin kimlere gorunecegini kural bazli tanimlar.',
        bullets: [
          'Kullanici sayfaya girse bile burada ilgili varlik icin kural yoksa sadece politika mantiginin izin verdigi kadar kayit gorur.',
          'Buradaki scope secimi sistem davranisini degistirir: sadece kendi kayitlari, bagli oldugu ekip, sirket geneli gibi.',
          'Ayni ekran, teklifler ve aktiviteler gibi farkli varliklar icin farkli gorunurluk modeli tanimlamana yarar.',
          'Bir politika aktif ama yanlis entity icin tanimliysa bekledigin etki hic olusmaz.',
        ],
      },
      {
        title: 'User Visibility Assignments',
        summary:
          'Bu ekran kullanici bazli gorunurluk istisnasi vermek icin kullanilir.',
        bullets: [
          'Standart kural yeterli degilse belirli bir kullaniciya entity bazli farkli visibility policy baglayabilirsin.',
          'Bu yapi, genel kural bozulmadan tek bir yonetici veya ozel kullanici icin farkli gorunurluk vermek icin idealdir.',
          'Tum sirketi etkileyen kural degil, istisna tanimlamak istiyorsan burada calismalisin.',
          'Bu ekran grup yetkisi vermez; sadece kayit gorunurlugunu degistirir.',
        ],
      },
      {
        title: 'Visibility Simulator',
        summary:
          'Bu ekran bir kullanici, bir varlik ve bir kayit secildiginde sistemin gercekte ne gosterecegini test eder.',
        bullets: [
          'Kural yazdin ama sonucundan emin degilsen burada kullaniciyi ve entity tipini secip gorunen kullanicilari okuyabilirsin.',
          'Belirli bir kaydin id degerini yazarsan o kayit icin sonuc hesaplanir.',
          'Approval override veya audit girisleri varsa simulator bunu da gosterir.',
          'Canliya cikmadan once sonuc dogru mu sorusunun en guvenli cevabi bu ekrandir.',
        ],
      },
      {
        title: 'Permission Definitions',
        summary:
          'Bu ekran artik operasyonel zorunluluk icin degil, sistem katalog mantigini anlamak icin referans niteligindedir.',
        bullets: [
          'Permission kodlari artik otomatik senkron mantigiyla yonetiliyor.',
          'Gunun sonunda yoneticinin ana calisma alani Permission Groups ve atama ekranlaridir.',
          'Yeni route veya yeni izin katalogu geldiginde sistem bunu otomatik kataloga alacak sekilde kurgulanmistir.',
        ],
      },
    ],
    scenarios: [
      {
        title: 'Senaryo 1: Satis temsilcisi sadece kendi tekliflerini gorsun',
        target: 'Teklif ekranina girsin, yeni teklif acabilsin ama baskalarinin tekliflerini gormesin.',
        steps: [
          'Permission Groups ekraninda kullanacagi gruba `sales.quotations.view` ve ihtiyac varsa `sales.quotations.create` ekle.',
          'Bu grubu User Group Assignments ekranindan ilgili satis temsilcisine ata.',
          'Visibility Policies ekraninda Quotation entity icin sadece kendi kayitlarini gosteren bir politika tanimla.',
          'Gerekirse bu politikayi User Visibility Assignments ekranindan kullaniciya bagla.',
        ],
        result:
          'Kullanici teklif sayfasini acar, yeni teklif olusturabilir ama listede sadece kendi yetki kapsamina giren teklifleri gorur.',
      },
      {
        title: 'Senaryo 2: Satis muduru kendi ekibinin aktivitelerini gorsun',
        target: 'Mudurun ekip aktivitesini takip etmesi ama tum sirket datasini gormemesi.',
        steps: [
          'Permission Groups ekraninda `activity.activity-management.view` iznini ilgili yonetici grubuna ekle.',
          'Aktiviteyi guncelleyecekse `activity.activity-management.update` iznini de ekle.',
          'Visibility Policies ekraninda Activity entity icin ekibe bagli kapsami tanimlayan politikayi aktif et.',
          'Bu politikayi dogrudan yonetici kullaniciya veya uygun yonetici grubundaki kullanicilara bagla.',
        ],
        result:
          'Yonetici aktivite ekranina girer, sadece kendi ekibiyle ilgili aktiviteleri gorur; alakasiz kullanicilarin aktiviteleri listelenmez.',
      },
      {
        title: 'Senaryo 3: Kullanici siparisleri sadece izlesin, olusturamasin',
        target: 'Siparis ekranina girsin ama yeni siparis acamasin.',
        steps: [
          'Permission Groups ekraninda `sales.orders.view` izni ver.',
          'Ayni gruba `sales.orders.create` izni verme.',
          'Kullaniciya User Group Assignments ekranindan bu grubu ata.',
        ],
        result:
          'Kullanici siparis listesini acabilir. Ama yeni siparis butonu veya create akisi izin olmadigi icin kullanilamaz.',
      },
      {
        title: 'Senaryo 4: Onay surecinde olan bir teklif denetim amaciyla gorunebilsin',
        target: 'Normal gorunurluk disinda kalan bir kayit, onay etkisiyle neden gorundugunu aciklayabilsin.',
        steps: [
          'Once Visibility Simulator ekraninda kullanici, entity olarak Quotation ve ilgili kayit id bilgisi sec.',
          'Preview ve audit sonucuna bak.',
          'Approval override varsa bunu audit alaninda goreceksin.',
        ],
        result:
          'Boylece kayit neden gorunuyor sorusunun cevabi tahminle degil, sistemin audit verisiyle okunur.',
      },
    ],
    mistakes: [
      'Sadece gorunurluk kurali tanimlayip sayfa izni vermemek. Sonuc: kullanici sayfaya hic giremez.',
      'Sadece page izni verip visibility kurali dusunmemek. Sonuc: beklenenden fazla kayit gorulebilir.',
      'Kullaniciya birden fazla grup atayip birlesen izin etkisini hesaba katmamak.',
      'Simulatorde test etmeden canli veri icin politika yayinlamak.',
      'Teklif, aktivite, talep ve siparis entity tiplerini karistirmak.',
    ],
    checklist: [
      'Ilk once kullanicinin hangi sayfaya girmesi gerektigini netlestir.',
      'Sonra o sayfadaki hangi aksiyonlari yapmasi gerektigini sec.',
      'Ardindan o entity icin hangi kayitlari gorecegini visibility ile sinirla.',
      'Gerekirse kullanici bazli istisnayi User Visibility Assignments ile ver.',
      'En son Visibility Simulator ile sonucu test et.',
    ],
    faqs: [
      {
        question: 'Bir kullanici teklif sayfasina girebiliyor ama kayit goremiyor. Neden?',
        answer:
          'Sayfa izni vardir ama gorunurluk kurali kayitlari kisitliyordur. Yani permission dogru, visibility eksik veya fazla dar olabilir.',
      },
      {
        question: 'Bir kullanici hic teklif ekleyemiyor. Neden?',
        answer:
          'Genelde `sales.quotations.create` izni eksiktir. View izni ekranı acar ama create izni yeni kayit olusturma yetkisini acar.',
      },
      {
        question: 'Bir kullanici fazla kayit goruyor. Nereden baslamaliyim?',
        answer:
          'Once hangi permission gruplarina bagli oldugunu kontrol et. Sonra entity bazli visibility policy ve user visibility assignment kayitlarini incele. En sonunda simulatorde ayni kullaniciyi test et.',
      },
    ],
  },
  en: {
    title: 'Access Control Guide',
    description:
      'This guide explains what each access-control screen does and what each setting changes. The goal is to make the system understandable even for someone who is seeing the model for the first time.',
    quickRules: [
      'Page permission and record visibility are different concerns. A user may open a page but still see only a subset of records.',
      'Permission Groups decide which pages and actions the user can access.',
      'Visibility Policies decide which records inside those pages the user can see.',
      'User Group Assignments attach groups. User Visibility Assignments attach visibility exceptions for a specific user.',
      'Do not publish a visibility rule without checking the result in Visibility Simulator.',
    ],
    pageCards: [
      {
        title: 'Permission Groups',
        summary: 'This screen controls which modules a user can open and which actions they can perform.',
        bullets: [
          'If a user should open Quotations, they need a view permission such as `sales.quotations.view`.',
          'If they should create quotations, the same group also needs `sales.quotations.create`.',
          'If they should update or delete, the related update or delete permissions are also required.',
          'These permissions open the page and action gates; they do not define record-level visibility by themselves.',
        ],
      },
      {
        title: 'User Group Assignments',
        summary: 'This screen attaches one or more permission groups to a user.',
        bullets: [
          'You select a user first, then attach the groups that user should inherit.',
          'When a user has multiple groups, permissions are merged.',
          'A wrong group assignment can expose pages the user was never meant to access.',
          'This screen is usually the main role distribution area: sales rep, manager, operations, system admin.',
        ],
      },
      {
        title: 'Visibility Policies',
        summary: 'This screen defines who can see records such as quotations, activities, demands, and orders.',
        bullets: [
          'Even if the user can enter the page, this policy layer still decides which records are visible.',
          'The selected scope changes behavior: own records only, team scope, company-wide scope, and similar patterns.',
          'Different entities such as quotations and activities can use different visibility models.',
          'If a policy is active but attached to the wrong entity, the expected result will never appear.',
        ],
      },
      {
        title: 'User Visibility Assignments',
        summary: 'This screen is for user-specific visibility exceptions.',
        bullets: [
          'Use it when the standard policy is not enough and one user needs a different visibility model.',
          'It is ideal for exceptions without changing the company-wide rule.',
          'This screen does not grant page access; it only changes record visibility.',
        ],
      },
      {
        title: 'Visibility Simulator',
        summary: 'This screen shows what the system will really expose for a selected user and entity.',
        bullets: [
          'If you are unsure about a rule, select the user and entity and inspect the visible users and the audit result.',
          'If you enter a concrete record id, the simulation becomes record-specific.',
          'Approval overrides and audit entries are surfaced here as well.',
          'This is the safest place to validate the final behavior before relying on a policy in production.',
        ],
      },
      {
        title: 'Permission Definitions',
        summary: 'This screen is no longer an operational dependency for day-to-day administration.',
        bullets: [
          'Permission codes are now handled through an automatic synchronization flow.',
          'The main operational surfaces are Permission Groups and the assignment screens.',
          'The catalog remains useful as a reference for understanding the underlying permission model.',
        ],
      },
    ],
    scenarios: [
      {
        title: 'Scenario 1: Sales rep should only see their own quotations',
        target: 'The user should open quotations, maybe create them, but not see other people’s records.',
        steps: [
          'Add `sales.quotations.view` and, if needed, `sales.quotations.create` to the relevant permission group.',
          'Assign that group to the sales rep from User Group Assignments.',
          'Create a quotation visibility policy that limits access to the user’s own records.',
          'Attach that policy to the user if a user-level assignment is needed.',
        ],
        result:
          'The user opens the quotations page and can work there, but the list is still limited to their allowed records.',
      },
      {
        title: 'Scenario 2: Sales manager should see team activities',
        target: 'The manager should monitor team activity without seeing unrelated company-wide records.',
        steps: [
          'Add `activity.activity-management.view` to the manager group.',
          'Add update permission too if the manager should edit activities.',
          'Create an activity visibility policy with a team-oriented scope.',
          'Assign that policy to the manager or the relevant users.',
        ],
        result:
          'The manager can open activities and see the team scope, but not unrelated records.',
      },
      {
        title: 'Scenario 3: User may view orders but must not create them',
        target: 'The page should open, but the create flow should remain closed.',
        steps: [
          'Grant `sales.orders.view`.',
          'Do not grant `sales.orders.create`.',
          'Assign the group to the user.',
        ],
        result:
          'The user can browse order data but cannot create a new order.',
      },
      {
        title: 'Scenario 4: Explain why a quotation becomes visible during approval',
        target: 'Understand a special visibility result through audit evidence instead of guesswork.',
        steps: [
          'Open Visibility Simulator and select the user.',
          'Choose Quotation and enter the record id.',
          'Review preview data and audit entries.',
        ],
        result:
          'If approval override logic is involved, the simulator shows that evidence directly.',
      },
    ],
    mistakes: [
      'Defining visibility without granting page permission. Result: the user cannot even open the page.',
      'Granting page permission without considering visibility. Result: the user may see too many records.',
      'Ignoring merged permissions when a user belongs to multiple groups.',
      'Publishing a policy without testing it in the simulator.',
      'Mixing up entity types such as quotation, activity, demand, and order.',
    ],
    checklist: [
      'First define which page the user must access.',
      'Then define which actions they must perform on that page.',
      'Then restrict which records they are allowed to see.',
      'Use user-level visibility assignments only when you need a specific exception.',
      'Validate the final result in Visibility Simulator.',
    ],
    faqs: [
      {
        question: 'A user can open quotations but sees no records. Why?',
        answer:
          'Page permission is likely correct, but the visibility layer is restricting records too much or has not been assigned correctly.',
      },
      {
        question: 'A user cannot create quotations. Why?',
        answer:
          'The usual cause is a missing `sales.quotations.create` permission. View opens the page; create opens the creation action.',
      },
      {
        question: 'A user sees too many records. Where should I start?',
        answer:
          'Check assigned permission groups first, then entity-specific visibility policies and user visibility assignments, and finally verify the behavior in the simulator.',
      },
    ],
  },
};

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
          <span className="rounded-2xl bg-pink-500/10 p-3 text-pink-600 dark:text-pink-300">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span className="text-slate-700 dark:text-slate-200">{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AccessControlGuidePage(): ReactElement {
  const { t, i18n } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const locale = i18n.resolvedLanguage?.startsWith('tr') ? 'tr' : 'en';
  const copy = GUIDE_COPY[locale];

  useEffect(() => {
    setPageTitle(copy.title);
    return () => setPageTitle(null);
  }, [copy.title, setPageTitle]);

  const pageCards = useMemo(() => copy.pageCards, [copy.pageCards]);

  return (
    <div className="w-full space-y-6">
      <Breadcrumb
        items={[
          { label: t('sidebar.accessControl', { defaultValue: locale === 'tr' ? 'Erisim Kontrolu' : 'Access Control' }) },
          { label: t('sidebar.accessControlGuide', { defaultValue: locale === 'tr' ? 'Erisim Kontrolu Rehberi' : 'Access Control Guide' }), isActive: true },
        ]}
      />

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-xl dark:border-white/10 dark:bg-[#180F22]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-200">
              <BookOpen className="size-3.5" />
              {t('common.guide', { defaultValue: locale === 'tr' ? 'Rehber' : 'Guide' })}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {copy.description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {locale === 'tr' ? 'Ana Mantik' : 'Core Logic'}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                {locale === 'tr' ? 'Izin verir, gorunurluk sinirlar.' : 'Permissions allow, visibility limits.'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {locale === 'tr' ? 'Son Kontrol' : 'Final Check'}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                {locale === 'tr' ? 'Simulatorde dogrula.' : 'Validate in simulator.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SummaryBlock
        icon={<ShieldCheck className="size-5" />}
        title={locale === 'tr' ? 'Bu Sistemin 5 Temel Kurali' : 'Five Core Rules'}
        items={copy.quickRules}
      />

      <Card className="rounded-[2rem] border border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Workflow className="size-5 text-orange-500" />
            {locale === 'tr' ? 'Hangi Ekran Ne Ise Yarar?' : 'What Does Each Screen Do?'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {pageCards.map((card, index) => (
              <AccordionItem
                key={card.title}
                value={card.title}
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
                      <div key={bullet} className="flex gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-[#130822]">
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
            {locale === 'tr' ? 'Ornekli Senaryolar' : 'Scenario-Based Examples'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {copy.scenarios.map((scenario, index) => (
            <Card key={scenario.title} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
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
                    <div key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-[#130822]">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white dark:bg-white dark:text-slate-900">
                        {stepIndex + 1}
                      </div>
                      <span className="text-slate-700 dark:text-slate-200">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                    {locale === 'tr' ? 'Beklenen Sonuc' : 'Expected Result'}
                  </div>
                  <p className="mt-2 text-emerald-900 dark:text-emerald-100">{scenario.result}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SummaryBlock
          icon={<TriangleAlert className="size-5" />}
          title={locale === 'tr' ? 'En Sık Yapilan Hatalar' : 'Common Mistakes'}
          items={copy.mistakes}
        />
        <SummaryBlock
          icon={<Eye className="size-5" />}
          title={locale === 'tr' ? 'Dogru Kurulum Sirasi' : 'Recommended Setup Order'}
          items={copy.checklist}
        />
      </div>

      <Card className="rounded-[2rem] border border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Users2 className="size-5 text-violet-500" />
            {locale === 'tr' ? 'Sik Sorulan Sorular' : 'Frequently Asked Questions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {copy.faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                value={faq.question}
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
            <div className="text-sm font-black text-amber-900 dark:text-amber-100">
              {locale === 'tr' ? 'Kisa karar kurali' : 'Short decision rule'}
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900/90 dark:text-amber-100/90">
              {locale === 'tr'
                ? 'Bir kullanici bir sey yapamiyorsa once Permission Group tarafina bak. Bir kullanici fazla veya eksik kayit goruyorsa once Visibility tarafina bak. Son karari ise her zaman Visibility Simulator ile dogrula.'
                : 'If a user cannot perform an action, start with Permission Groups. If a user sees too many or too few records, start with Visibility. Always verify the final decision in Visibility Simulator.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
