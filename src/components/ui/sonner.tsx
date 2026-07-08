import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-primary/15 group-[.toaster]:bg-background/98 group-[.toaster]:text-foreground group-[.toaster]:shadow-2xl group-[.toaster]:shadow-[0_24px_60px_-24px_var(--crm-brand-shadow)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:dark:border-primary/20 group-[.toaster]:dark:bg-slate-950/98",
          description: "group-[.toast]:text-slate-500 group-[.toast]:dark:text-slate-300",
          actionButton:
            "group-[.toast]:rounded-xl group-[.toast]:bg-[image:var(--crm-brand-gradient)] group-[.toast]:font-bold group-[.toast]:text-white group-[.toast]:shadow-[0_8px_18px_-10px_var(--crm-brand-shadow)]",
          cancelButton:
            "group-[.toast]:rounded-xl group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:rounded-xl group-[.toast]:border group-[.toast]:border-slate-200/80 group-[.toast]:bg-white/80 group-[.toast]:text-slate-500 group-[.toast]:hover:bg-slate-100 group-[.toast]:dark:border-white/10 group-[.toast]:dark:bg-white/[0.06] group-[.toast]:dark:text-slate-300",
          error: "group-[.toaster]:text-red-600 group-[.toaster]:dark:text-red-400",
          success: "group-[.toaster]:text-emerald-700 group-[.toaster]:dark:text-emerald-300",
          warning: "group-[.toaster]:text-amber-700 group-[.toaster]:dark:text-amber-300",
          info: "group-[.toaster]:text-primary group-[.toaster]:dark:text-primary",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
