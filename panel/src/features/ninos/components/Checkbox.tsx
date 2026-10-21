import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}

/** Casilla de 16px del diseño (borde #d4d4d4, radio 4px); marcada se rellena con el color de marca. */
export function Checkbox({ checked, indeterminate = false, onChange, label, className }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className={cn(
        'size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-[#d4d4d4] bg-white transition-colors',
        'checked:border-brand checked:bg-brand checked:shadow-[inset_0_0_0_3px_#fff]',
        'indeterminate:border-brand indeterminate:bg-brand indeterminate:shadow-[inset_0_0_0_3px_#fff]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
    />
  )
}
