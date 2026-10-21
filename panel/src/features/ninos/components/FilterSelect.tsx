import chevronIcon from '../assets/icon-select-chevron.svg'

interface FilterSelectProps<T extends string> {
  /** Etiqueta accesible y prefijo visible, ej. "Edad" → "Edad: Todos (6-35m)". */
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}

/** Selector compacto del diseño (fondo #f1f3f2, radio 8px, chevron de 18px). */
export function FilterSelect<T extends string>({ label, value, options, onChange }: FilterSelectProps<T>) {
  return (
    <label className="relative inline-flex max-w-full">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="max-w-full cursor-pointer appearance-none truncate rounded-lg bg-chip py-1 pr-7 pl-2.5 text-xs leading-4 font-medium text-[#404040] transition-colors hover:bg-[#e8ebe9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {`${label}: ${option.label}`}
          </option>
        ))}
      </select>
      <img
        src={chevronIcon}
        alt=""
        width={18}
        height={18}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
      />
    </label>
  )
}
