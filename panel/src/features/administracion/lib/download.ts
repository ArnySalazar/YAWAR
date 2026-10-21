/** Descarga un texto CSV como archivo, con BOM UTF-8 para que Excel respete las tildes. */
export function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([`﻿${content.replace(/^﻿/, '')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
