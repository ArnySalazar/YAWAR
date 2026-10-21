import lockIcon from '../assets/icon-lock-privacy.svg'

/** Nota de anonimización del pie del Figma (Ley N° 29733): solo código del niño y alias del cuidador. */
export function PrivacyNote() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[12px] border border-line bg-chip p-4">
      <p className="flex items-center gap-1 text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">
        <img src={lockIcon} alt="" width={10.667} height={13.333} className="shrink-0" />
        Datos anonimizados para resguardo de identidad (Ley N° 29733): solo código del niño y alias del cuidador
      </p>
    </div>
  )
}
