import { type ReactElement, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CloudUpload, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { useStockImageUpload } from '../hooks/useStockImageUpload';
import { cn } from '@/lib/utils';

interface StockImageUploadProps {
  stockId: number;
}

export function StockImageUpload({ stockId }: StockImageUploadProps): ReactElement {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [altTexts, setAltTexts] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const uploadImages = useStockImageUpload();

  useEffect(() => {
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);

    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addFiles = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
    setAltTexts((prev) => [...prev, ...files.map(() => '')]);
  };

  const handleRemoveFile = (index: number): void => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setAltTexts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAltTextChange = (index: number, value: string): void => {
    const newAltTexts = [...altTexts];
    newAltTexts[index] = value;
    setAltTexts(newAltTexts);
  };

  const handleUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      await uploadImages.mutateAsync({
        stockId,
        files: selectedFiles,
        altTexts: altTexts.length > 0 ? altTexts : undefined,
      });

      setSelectedFiles([]);
      setAltTexts([]);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      addFiles(files);
    }
  };

  return (
    <div className="space-y-6">
      
      <div
        className={cn(
            "relative group border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300",
            isDragging 
                ? "border-pink-500 bg-pink-50 dark:bg-pink-900/10 scale-[1.01]" 
                : "border-zinc-200 dark:border-zinc-700 hover:border-pink-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-orange-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className={cn(
                "p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 transition-colors duration-300",
                isDragging ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30" : "group-hover:text-pink-600"
            )}>
                <CloudUpload className="h-8 w-8" />
            </div>
            <div>
                <p className="text-base font-semibold text-zinc-900 dark:text-white">
                    {t('stock.images.upload')}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                    {t('stock.images.uploadHint')}
                </p>
            </div>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 pl-1">
              {t('stock.images.selectedFiles')} ({selectedFiles.length})
            </Label>
          </div>

          <div className="grid gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="
                    relative flex items-start gap-4 p-3 
                    bg-white/60 dark:bg-zinc-900/60 
                    border border-zinc-200 dark:border-white/10 
                    rounded-xl shadow-sm
                    backdrop-blur-sm
                    group
                "
              >
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                    <img 
                        src={previews[index]} 
                        alt="Preview" 
                        className="h-full w-full object-cover"
                    />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                  </div>
                  
                  <div className="relative">
                      <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder={t('stock.images.altText')}
                        value={altTexts[index] || ''}
                        onChange={(e) => handleAltTextChange(index, e.target.value)}
                        className="
                            h-8 pl-8 text-xs 
                            bg-transparent 
                            border-zinc-200 dark:border-zinc-700
                            focus-visible:ring-1 focus-visible:ring-pink-500
                        "
                      />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg -mt-1 -mr-1"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
                onClick={handleUpload}
                disabled={uploadImages.isPending || uploading}
                className="
                    w-full h-11 relative overflow-hidden
                    bg-linear-to-r from-pink-600 to-orange-600 
                    hover:from-pink-500 hover:to-orange-500
                    text-white font-bold tracking-wide rounded-xl
                    shadow-lg shadow-pink-500/25 
                    hover:shadow-pink-500/40 hover:scale-[1.01] active:scale-[0.99]
                    transition-all duration-300
                    border-0
                "
            >
                {uploadImages.isPending || uploading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('stock.images.uploading')}
                    </>
                ) : (
                    <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {t('stock.images.uploadButton')}
                    </>
                )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}