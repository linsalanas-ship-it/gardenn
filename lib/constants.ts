import type { Category, Language } from './types'

export const CATEGORIES: Record<Category, { label: string; color: string; bg: string }> = {
  manifesto: { label: 'Manifesto', color: '#5B21B6', bg: '#F5F3FF' },
  'identidade-verbal': { label: 'Identidade Verbal', color: '#1D4ED8', bg: '#EFF6FF' },
  copywriting: { label: 'Copywriting', color: '#065F46', bg: '#ECFDF5' },
  poesia: { label: 'Poesia', color: '#9D174D', bg: '#FDF2F8' },
  email: { label: 'Email', color: '#9A3412', bg: '#FFF7ED' },
  naming: { label: 'Naming', color: '#134E4A', bg: '#F0FDFA' },
  ooh: { label: 'OOH / Mídia', color: '#92400E', bg: '#FFFBEB' },
}

export const LANGUAGES: Record<Language, { label: string; color: string }> = {
  pt: { label: 'PT', color: '#047857' },
  en: { label: 'EN', color: '#1D4ED8' },
  es: { label: 'ES', color: '#B91C1C' },
}

export const INDUSTRIES = [
  'Alimentação',
  'Automotivo',
  'Beleza',
  'Cultura',
  'Educação',
  'Esporte',
  'Financeiro',
  'Moda',
  'Saúde',
  'Tech',
  'Varejo',
  'Outro',
] as const

export type Industry = (typeof INDUSTRIES)[number]
