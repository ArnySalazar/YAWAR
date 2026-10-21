import footerShield from '@/assets/icons/footer-shield.svg'

export function AppFooter() {
  return (
    <footer className="bg-chip print:hidden">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2 px-4 py-[23px] sm:px-6 lg:px-8">
        <img src={footerShield} alt="" width={12.833} height={12.25} className="shrink-0" />
        <p className="text-[13px] leading-[18px] text-muted">
          YAWAR CRED · Apoyo a decisiones de seguimiento nutricional
        </p>
      </div>
    </footer>
  )
}
