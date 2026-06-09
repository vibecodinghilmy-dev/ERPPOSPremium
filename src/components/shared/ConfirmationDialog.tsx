import { useState } from 'react'
import { AlertTriangle, Info, ShieldAlert, HelpCircle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { animation, focusRing, touchTarget } from '@/lib/design-tokens'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'approval'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  variant?: ConfirmVariant
  confirmLabel?: string
  cancelLabel?: string
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  requireConfirmationText?: boolean
  confirmationText?: string
  confirmationLabel?: string
  destructive?: boolean
  onConfirm: (reason?: string) => void
  onCancel?: () => void
  isLoading?: boolean
}

const variantConfig = {
  danger: {
    icon: ShieldAlert,
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    buttonVariant: 'destructive' as const,
    titleColor: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    buttonVariant: 'warning' as const,
    titleColor: 'text-warning',
  },
  info: {
    icon: Info,
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    buttonVariant: 'default' as const,
    titleColor: 'text-foreground',
  },
  approval: {
    icon: HelpCircle,
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    buttonVariant: 'success' as const,
    titleColor: 'text-foreground',
  },
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter reason for this action...',
  requireConfirmationText = false,
  confirmationText = '',
  confirmationLabel = 'Type to confirm',
  destructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [reason, setReason] = useState('')
  const [typedText, setTypedText] = useState('')
  const config = variantConfig[variant]

  const isValid = (!requireReason || reason.trim().length > 0) &&
    (!requireConfirmationText || typedText === confirmationText)

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm(requireReason ? reason.trim() : undefined)
    setReason('')
    setTypedText('')
  }

  const handleCancel = () => {
    onCancel?.()
    setReason('')
    setTypedText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) handleCancel()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('p-2.5 rounded-xl', config.bgColor, config.borderColor, 'border')}>
              <config.icon className={cn('w-5 h-5', config.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className={cn('text-base', config.titleColor)}>
                {title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className={cn('p-1 rounded-md hover:bg-muted transition-colors', focusRing)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {requireReason && (
            <div>
              <Label className="text-xs font-semibold">{reasonLabel} *</Label>
              <Input
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>
          )}

          {requireConfirmationText && (
            <div>
              <Label className="text-xs font-semibold">
                {confirmationLabel} <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-1.5">
                Type <span className="font-mono font-bold text-foreground">{confirmationText}</span> to confirm
              </p>
              <Input
                placeholder={`Type "${confirmationText}"`}
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="mt-1.5 font-mono text-sm"
                autoFocus={!requireReason}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className={cn(touchTarget.mobile)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : config.buttonVariant}
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className={cn(touchTarget.mobile)}
          >
            {isLoading ? (
              <>
                <div className={cn('w-4 h-4 border-2 border-current border-t-transparent rounded-full', animation.spin)} />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}