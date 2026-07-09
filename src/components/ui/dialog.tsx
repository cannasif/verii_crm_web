import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const VOICE_SEARCH_COMBOBOX_PORTAL_SELECTOR = "[data-voice-search-combobox-portal]"

function isVoiceSearchComboboxPortalTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(VOICE_SEARCH_COMBOBOX_PORTAL_SELECTOR))
}

function getDialogOutsideEventTarget(event: Event): EventTarget | null {
  if ("detail" in event && event.detail && typeof event.detail === "object") {
    const originalEvent = (event.detail as { originalEvent?: Event }).originalEvent
    if (originalEvent?.target) {
      return originalEvent.target
    }
  }
  return event.target
}

function shouldIgnoreDialogOutsideEvent(event: Event): boolean {
  return isVoiceSearchComboboxPortalTarget(getDialogOutsideEventTarget(event))
}

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  overlayClassName,
  children,
  showCloseButton = true,
  onFocusOutside,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  overlayClassName?: string
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onFocusOutside={(event) => {
          if (shouldIgnoreDialogOutsideEvent(event)) {
            event.preventDefault()
          }
          onFocusOutside?.(event)
        }}
        onPointerDownOutside={(event) => {
          if (shouldIgnoreDialogOutsideEvent(event)) {
            event.preventDefault()
          }
          onPointerDownOutside?.(event)
        }}
        onInteractOutside={(event) => {
          if (shouldIgnoreDialogOutsideEvent(event)) {
            event.preventDefault()
          }
          onInteractOutside?.(event)
        }}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-4 shadow-lg duration-200 sm:w-full sm:max-w-[calc(100%-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:p-6 lg:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full border border-slate-200/60 bg-white/50 text-slate-400 transition-all duration-300 hover:bg-white hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-primary focus:outline-hidden disabled:pointer-events-none"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Kapat</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
