import { type ReactElement, useState } from 'react';
import { Download, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AiAssistantStructuredResultDto } from '../types/ai-assistant.types';
import {
  exportAiAssistantResultToExcel,
  exportAiAssistantResultToPdf,
} from '../utils/ai-assistant-export';

type Props = {
  result: AiAssistantStructuredResultDto;
  question: string;
  answer: string;
  language: string;
  labels: {
    action: string;
    excel: string;
    pdf: string;
    success: string;
    error: string;
  };
};

export function AiAssistantExportMenu({ result, question, answer, language, labels }: Props): ReactElement {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const runExport = async (format: 'excel' | 'pdf'): Promise<void> => {
    if (exporting) return;
    setExporting(format);
    try {
      const params = { result, question, answer, language };
      if (format === 'excel') await exportAiAssistantResultToExcel(params);
      else await exportAiAssistantResultToPdf(params);
      toast.success(labels.success);
    } catch {
      toast.error(labels.error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={exporting !== null} title={labels.action}>
          {exporting ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void runExport('excel')} disabled={exporting !== null}>
          <FileSpreadsheet size={15} className="me-2 text-emerald-600" />
          {labels.excel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void runExport('pdf')} disabled={exporting !== null}>
          <FileText size={15} className="me-2 text-rose-600" />
          {labels.pdf}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
