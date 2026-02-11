import { type ReactElement, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image, Upload, X, Trash2 } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE, type FileWithPreview } from '../types/activity-image-types';

interface ActivityImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[], descriptions: string[]) => void;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-11 rounded-lg
  bg-slate-50 dark:bg-white/5
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-500
  focus-visible:bg-white dark:focus-visible:bg-white/5
  focus-visible:border-pink-500/70 focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  transition-all duration-200 w-full
`;

export function ActivityImageUploadDialog({
  open,
  onOpenChange,
  onUpload,
  isLoading = false,
}: ActivityImageUploadDialogProps): ReactElement {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files || []);
    
    const validFiles = files.filter((file) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        return false;
      }
      return true;
    });

    const newFiles: FileWithPreview[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      aciklama: '',
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number): void => {
    setSelectedFiles((prev) => {
      const file = prev[index];
      URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDescriptionChange = (index: number, value: string): void => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], aciklama: value };
      return updated;
    });
  };

  const handleUpload = (): void => {
    if (selectedFiles.length === 0) return;
    
    const files = selectedFiles.map((f) => f.file);
    const descriptions = selectedFiles.map((f) => f.aciklama);
    
    onUpload(files, descriptions);
    
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
  };

  const handleClose = (): void => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-w-3xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
              <Upload size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {t('activity-image:uploadImages', 'Resimleri Yükle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm truncate">
                {t('activity-image:uploadDescription', 'Birden fazla resim seçebilir ve yükleyebilirsiniz')}
              </DialogDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose} 
            className="shrink-0 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white" 
            aria-label={t('common.close', 'Kapat')}
          >
            <X size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <div className="space-y-6">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-pink-500/50 hover:bg-pink-50/50 dark:hover:bg-pink-500/5 transition-all">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Image className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('activity-image:clickToSelect', 'Dosya seçmek için tıklayın')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('activity-image:fileTypes', 'PNG, JPG, GIF, WEBP (maks. 5MB)')}
                      </p>
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('activity-image:selectedFiles', 'Seçilen Dosyalar')} ({selectedFiles.length})
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {selectedFiles.map((fileItem, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5"
                    >
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img
                          src={fileItem.preview}
                          alt={fileItem.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                          {fileItem.file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Input
                          value={fileItem.aciklama}
                          onChange={(e) => handleDescriptionChange(index, e.target.value)}
                          placeholder={t('activity-image:descriptionPlaceholder', 'Açıklama (opsiyonel)')}
                          className={INPUT_STYLE}
                          maxLength={500}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            className="h-11 px-5 rounded-lg font-medium"
          >
            {t('common.cancel', 'Vazgeç')}
          </Button>
          <Button 
            type="button" 
            onClick={handleUpload}
            disabled={isLoading || selectedFiles.length === 0} 
            className="h-11 px-6 rounded-lg bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading 
              ? t('common.uploading', 'Yükleniyor...') 
              : t('activity-image:upload', 'Yükle ({{count}})', { count: selectedFiles.length })
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
