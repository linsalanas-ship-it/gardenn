'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, LANGUAGES, INDUSTRIES } from '@/lib/constants'
import MultiImageUpload from '@/components/MultiImageUpload'
import type { Category, Language, Status, Reference } from '@/lib/types'

interface Props {
  initial?: Reference
  initialImages?: string[]
}

interface Analysis {
  language: Language
  category: Category
  industry: string | null
  tags: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface ImportResult {
  found: boolean
  reason?: string
  brand_name?: string
  title?: string
  content?: string
  category?: Category
  language?: Language
  industry?: string | null
  tags?: string[]
  og_image?: string | null
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function generateSlug(brand: string, category: string) {
  return `${slugify(brand)}-${category}-${Math.random().toString(36).slice(2, 6)}`
}

export default function ReferenceForm({ initial, initialImages = [] }: Props) {
  const router = useRouter()
  const isEditing = !!initial

  const [form, setForm] = useState({
    brand_name: initial?.brand_name ?? '',
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? ('' as Category),
    language: initial?.language ?? ('' as Language),
    industry: initial?.industry ?? '',
    year: initial?.year?.toString() ?? '',
    agency: initial?.agency ?? '',
    source_url: initial?.source_url ?? '',
    tags: initial?.tags?.join(', ') ?? '',
    status: initial?.status ?? ('published' as Status),
    slug: initial?.slug ?? '',
  })

  const [images, setImages] = useState<string[]>(initialImages)

  // URL import state
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(!isEditing)

  // Analyze state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Submit state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (!isEditing && (key === 'brand_name' || key === 'category')) {
        const brand = key === 'brand_name' ? value : prev.brand_name
        const cat = key === 'category' ? value : prev.category
        if (brand && cat) next.slug = generateSlug(brand, cat)
      }
      return next
    })
  }

  // ── URL Import ────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!importUrl.trim()) return

    setImporting(true)
    setImportError(null)
    setImportResult(null)

    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })

      const data: ImportResult & { error?: string; js_rendered?: boolean } = await res.json()

      if (data.error) {
        setImportError(data.error)
        if (data.js_rendered) {
          setForm((prev) => ({
            ...prev,
            source_url: prev.source_url || importUrl.trim(),
          }))
          if (data.og_image) setImages((prev) => (prev.includes(data.og_image!) ? prev : [...prev, data.og_image!]))
        }
        return
      }

      setImportResult(data)
    } catch {
      setImportError('Erro de conexão ao importar.')
    } finally {
      setImporting(false)
    }
  }

  function applyImport() {
    if (!importResult) return

    setForm((prev) => {
      const next = { ...prev }
      if (importResult.brand_name) next.brand_name = importResult.brand_name
      if (importResult.title) next.title = importResult.title
      if (importResult.content) next.content = importResult.content
      if (importResult.category) next.category = importResult.category
      if (importResult.language) next.language = importResult.language
      if (importResult.industry) next.industry = importResult.industry
      if (importResult.tags?.length) next.tags = importResult.tags.join(', ')
      if (!prev.source_url && importUrl) next.source_url = importUrl

      const brand = importResult.brand_name ?? prev.brand_name
      const cat = importResult.category ?? prev.category
      if (!isEditing && brand && cat) next.slug = generateSlug(brand, cat)

      return next
    })

    if (importResult.og_image) {
      setImages((prev) =>
        prev.includes(importResult.og_image!) ? prev : [importResult.og_image!, ...prev]
      )
    }

    setImportResult(null)
    setImportOpen(false)
  }

  // ── Analyze ───────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!form.content.trim()) {
      setAnalyzeError('Cole o texto antes de analisar.')
      return
    }
    setAnalyzing(true)
    setAnalyzeError(null)
    setAnalysis(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: form.content }),
      })
      const data: Analysis & { error?: string } = await res.json()
      if (data.error) { setAnalyzeError(data.error); return }
      setAnalysis(data)
    } catch {
      setAnalyzeError('Erro de conexão.')
    } finally {
      setAnalyzing(false)
    }
  }

  function applyAnalysis() {
    if (!analysis) return
    setForm((prev) => {
      const next = { ...prev }
      if (analysis.language) next.language = analysis.language
      if (analysis.category) {
        next.category = analysis.category
        if (!isEditing && prev.brand_name) next.slug = generateSlug(prev.brand_name, analysis.category)
      }
      if (analysis.industry) next.industry = analysis.industry
      if (analysis.tags?.length) next.tags = analysis.tags.join(', ')
      return next
    })
    setAnalysis(null)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      brand_name: form.brand_name,
      title: form.title || null,
      content: form.content,
      category: form.category as Category,
      language: form.language as Language,
      industry: form.industry || null,
      year: form.year ? parseInt(form.year) : null,
      agency: form.agency || null,
      source_url: form.source_url || null,
      image_url: images[0] || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: form.status as Status,
      slug: form.slug,
    }

    const supabase = createClient()
    let referenceId: string

    if (isEditing) {
      const { error } = await supabase
        .from('references')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', initial.id)
      if (error) { setError(error.message); setLoading(false); return }
      referenceId = initial.id
    } else {
      const { data, error } = await supabase
        .from('references')
        .insert(payload)
        .select('id')
        .single()
      if (error || !data) { setError(error?.message ?? 'Erro ao salvar.'); setLoading(false); return }
      referenceId = data.id
    }

    // Sync reference_images
    await supabase.from('reference_images').delete().eq('reference_id', referenceId)
    if (images.length > 0) {
      await supabase.from('reference_images').insert(
        images.map((url, i) => ({ reference_id: referenceId, image_url: url, position: i }))
      )
    }

    router.push('/admin')
    router.refresh()
  }

  const inputClass =
    'w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors bg-bg'
  const labelClass = 'block text-2xs text-muted uppercase tracking-widest mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-[720px]">

      {/* ── URL Import panel ─────────────────────────────────────────────── */}
      <div className="border border-border">
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs uppercase tracking-wider text-muted hover:text-ink transition-colors"
        >
          <span>✦ Importar de URL</span>
          <span className="text-faint">{importOpen ? '↑' : '↓'}</span>
        </button>

        {importOpen && (
          <div className="border-t border-border px-4 py-4 space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              Cole a URL de uma página e o sistema extrai o conteúdo automaticamente.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImport())}
                placeholder="https://"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importUrl.trim()}
                className="text-2xs uppercase tracking-wider bg-ink text-bg px-4 py-2 hover:bg-ink/80 transition-colors disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5"
              >
                {importing ? (
                  <>
                    <span className="inline-block w-2.5 h-2.5 border border-bg border-t-transparent rounded-full animate-spin" />
                    Buscando...
                  </>
                ) : 'Importar'}
              </button>
            </div>

            {importError && <p className="text-xs text-red-600">{importError}</p>}

            {importResult?.found && (
              <div className="border border-border bg-surface p-4 space-y-3">
                <p className="text-2xs text-muted uppercase tracking-widest">Encontrado — revise antes de aplicar</p>
                <div className="space-y-1.5 text-xs">
                  {importResult.brand_name && <div><span className="text-muted">Marca: </span><strong>{importResult.brand_name}</strong></div>}
                  {importResult.category && (
                    <div>
                      <span className="text-muted">Categoria: </span>
                      <strong>{CATEGORIES[importResult.category]?.label}</strong>
                      {importResult.language && <><span className="text-faint mx-2">·</span><span className="text-muted">Idioma: </span><strong>{importResult.language === 'pt' ? 'Português' : importResult.language === 'en' ? 'Inglês' : 'Espanhol'}</strong></>}
                    </div>
                  )}
                </div>
                {importResult.content && (
                  <p className="text-sm text-ink leading-relaxed line-clamp-4 border-l-2 border-ink pl-3 whitespace-pre-line">
                    {importResult.content}
                  </p>
                )}
                {importResult.og_image && (
                  <div className="w-full h-28 border border-border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={importResult.og_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {importResult.tags && importResult.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {importResult.tags.map((tag) => (
                      <span key={tag} className="text-2xs border border-border px-2 py-0.5 text-muted bg-bg">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={applyImport} className="text-2xs uppercase tracking-wider bg-ink text-bg px-4 py-1.5 hover:bg-ink/80 transition-colors">Aplicar tudo</button>
                  <button type="button" onClick={() => setImportResult(null)} className="text-2xs uppercase tracking-wider text-muted hover:text-ink transition-colors">Ignorar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main fields ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={labelClass}>Marca *</label>
          <input type="text" value={form.brand_name} onChange={(e) => set('brand_name', e.target.value)} required placeholder="ex: Nike" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Categoria *</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} required className={inputClass}>
            <option value="">Selecionar</option>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Idioma *</label>
          <select value={form.language} onChange={(e) => set('language', e.target.value)} required className={inputClass}>
            <option value="">Selecionar</option>
            {Object.entries(LANGUAGES).map(([key, lang]) => (
              <option key={key} value={key}>{lang.label === 'PT' ? 'Português' : lang.label === 'EN' ? 'Inglês' : 'Espanhol'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content + Analyze */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelClass} style={{ marginBottom: 0 }}>Texto da referência *</label>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !form.content.trim()}
            className="text-2xs uppercase tracking-wider text-muted hover:text-ink border border-border hover:border-border-hover px-3 py-1 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {analyzing ? <><span className="inline-block w-2.5 h-2.5 border border-muted border-t-transparent rounded-full animate-spin" />Analisando...</> : '✦ Analisar com IA'}
          </button>
        </div>
        <textarea value={form.content} onChange={(e) => set('content', e.target.value)} required rows={8} placeholder="Cole o texto aqui..." className={`${inputClass} resize-y leading-relaxed`} />

        {analysis && (
          <div className="mt-2 border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2.5 flex-1">
                <p className="text-2xs text-muted uppercase tracking-widest">
                  Sugestão da IA
                  <span className={`ml-2 ${analysis.confidence === 'high' ? 'text-green-600' : analysis.confidence === 'medium' ? 'text-amber-600' : 'text-red-500'}`}>
                    confiança {analysis.confidence === 'high' ? 'alta' : analysis.confidence === 'medium' ? 'média' : 'baixa'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                  <span><span className="text-muted">Categoria:</span> <strong>{CATEGORIES[analysis.category]?.label ?? analysis.category}</strong></span>
                  <span><span className="text-muted">Idioma:</span> <strong>{analysis.language === 'pt' ? 'Português' : analysis.language === 'en' ? 'Inglês' : 'Espanhol'}</strong></span>
                  {analysis.industry && <span><span className="text-muted">Setor:</span> <strong>{analysis.industry}</strong></span>}
                </div>
                {analysis.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tags.map((tag) => <span key={tag} className="text-2xs border border-border px-2 py-0.5 text-muted bg-bg">{tag}</span>)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button type="button" onClick={applyAnalysis} className="text-2xs uppercase tracking-wider bg-ink text-bg px-3 py-1.5 hover:bg-ink/80 transition-colors">Aplicar</button>
                <button type="button" onClick={() => setAnalysis(null)} className="text-2xs uppercase tracking-wider text-muted hover:text-ink transition-colors">Ignorar</button>
              </div>
            </div>
          </div>
        )}
        {analyzeError && <p className="mt-1.5 text-xs text-red-600">{analyzeError}</p>}
      </div>

      <div>
        <label className={labelClass}>Título / contexto (opcional)</label>
        <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="ex: Manifesto de lançamento, 2023" className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className={labelClass}>Setor</label>
          <select value={form.industry} onChange={(e) => set('industry', e.target.value)} className={inputClass}>
            <option value="">Selecionar</option>
            {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ano</label>
          <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="ex: 2023" min={1900} max={new Date().getFullYear()} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
            <option value="published">Publicado</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Agência / Autor</label>
        <input type="text" value={form.agency} onChange={(e) => set('agency', e.target.value)} placeholder="ex: Wieden+Kennedy" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Tags (separadas por vírgula)</label>
        <input type="text" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="ex: feminismo, propósito, minimalismo" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>URL da fonte</label>
        <input type="url" value={form.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://" className={inputClass} />
      </div>

      {/* ── Images ───────────────────────────────────────────────────────── */}
      <div>
        <label className={labelClass}>Imagens</label>
        <MultiImageUpload
          values={images}
          onChange={setImages}
          sourceUrl={form.source_url}
        />
      </div>

      <div>
        <label className={labelClass}>Slug</label>
        <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)} required className={`${inputClass} text-muted`} />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-4 pt-2">
        <button type="submit" disabled={loading} className="bg-ink text-bg text-xs uppercase tracking-widest px-6 py-2.5 hover:bg-ink/80 transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Publicar referência'}
        </button>
        <button type="button" onClick={() => router.push('/admin')} className="text-xs text-muted hover:text-ink uppercase tracking-widest transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
