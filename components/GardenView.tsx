'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Reference } from '@/lib/types'

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seededRng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0x100000000 }
}

// ── Botanical color palette ───────────────────────────────────────────────────
// Each entry: [dark (outline/center), mid (fill), light (petal tip/highlight)]

const BOTANICAL: Record<string, [string, string, string]> = {
  texto:              ['#A0321A', '#D4603A', '#EFA882'],
  link:               ['#1A4A8C', '#3876C8', '#89B8EE'],
  imagem:             ['#1A5C30', '#2E8B50', '#80C89A'],
  video:              ['#5A1A8A', '#8B44BF', '#C49EDE'],
  audio:              ['#A04010', '#D4702A', '#F0B070'],
  citacao:            ['#1A5040', '#2A8060', '#78C0A0'],
  outro:              ['#3A3A4A', '#686878', '#A8A8B8'],
  manifesto:          ['#7A1040', '#C0305A', '#E890A8'],
  'identidade-verbal':['#0E3060', '#2060A8', '#80AAD8'],
  copywriting:        ['#0A4A20', '#208040', '#70B880'],
  poesia:             ['#6A1010', '#A83030', '#D88080'],
  email:              ['#703010', '#B05820', '#E0A060'],
  naming:             ['#0A3C3C', '#1A7878', '#70B8B8'],
  ooh:                ['#4A0A6A', '#7C28A8', '#B878D8'],
}
const DEFAULT_BOT = BOTANICAL['poesia']

// ── Plant data ────────────────────────────────────────────────────────────────

type PlantData = {
  ref: Reference
  x: number; groundY: number; scale: number
  height: number; lean: number; archetype: number
  animDelay: number; animDuration: number
  leafPositions: { t: number; side: -1 | 1; w: number; h: number; angle: number }[]
  flowerR: number; petalCount: number
  branchOffsets: { dx: number; dy: number; r: number; angle: number }[]
}

function buildPlant(ref: Reference, x: number, groundY: number, scale: number): PlantData {
  const rng = seededRng(ref.id)
  const archetype = Math.floor(rng() * 3)
  const height = (75 + rng() * 105) * scale
  const lean = (rng() - 0.5) * 44
  const leafCount = 1 + Math.floor(rng() * 3)
  const leafPositions = Array.from({ length: leafCount }, () => {
    const side = (rng() > 0.5 ? 1 : -1) as -1 | 1
    return {
      t: 0.28 + rng() * 0.52,
      side,
      w: (12 + rng() * 20) * scale,
      h: (6 + rng() * 10) * scale,
      angle: side * (25 + rng() * 30),
    }
  })
  const flowerR = (10 + rng() * 18) * scale
  const petalCount = 5 + Math.floor(rng() * 5)
  const branchCount = 2 + Math.floor(rng() * 3)
  const branchOffsets = Array.from({ length: branchCount }, (_, i) => ({
    dx: (rng() - 0.5) * flowerR * 2.8,
    dy: -(i * flowerR * 0.9),
    r: flowerR * (0.38 + rng() * 0.45),
    angle: (rng() - 0.5) * 50,
  }))
  return {
    ref, x, groundY, scale, height, lean, archetype,
    animDelay: rng() * 5, animDuration: 3.5 + rng() * 4,
    leafPositions, flowerR, petalCount, branchOffsets,
  }
}

// ── Plant SVG ─────────────────────────────────────────────────────────────────

function Plant({ plant, hovered, onClick, onHover }: {
  plant: PlantData; hovered: boolean
  onClick: () => void; onHover: (id: string | null) => void
}) {
  const [dark, mid, light] = BOTANICAL[plant.ref.category] ?? DEFAULT_BOT
  const { x, groundY, height, lean, leafPositions, flowerR, petalCount, branchOffsets, animDelay, animDuration, archetype } = plant

  const tipX = x + lean * 0.38
  const tipY = groundY - height
  const ctrlX = x + lean * 0.82
  const ctrlY = groundY - height * 0.5

  const gradId = `g-${plant.ref.id.slice(0, 8)}`
  const leafGradId = `lg-${plant.ref.id.slice(0, 8)}`

  return (
    <g
      style={{
        transformOrigin: `${x}px ${groundY}px`,
        animation: `plantSway ${animDuration}s ease-in-out ${animDelay}s infinite alternate`,
        cursor: 'pointer',
        transition: 'opacity 0.2s',
        opacity: hovered ? 1 : 0.88,
      }}
      onMouseEnter={() => onHover(plant.ref.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Per-plant gradients */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={mid} />
          <stop offset="100%" stopColor={light} />
        </linearGradient>
        <linearGradient id={leafGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2D6E3A" />
          <stop offset="100%" stopColor="#8AC87A" />
        </linearGradient>
      </defs>

      {/* Stem */}
      <path
        d={`M ${x} ${groundY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
        stroke={dark} strokeWidth={hovered ? 1.4 : 1.0}
        fill="none" strokeLinecap="round" opacity={0.75}
      />

      {/* Leaves */}
      {leafPositions.map((lp, i) => {
        const lx = x + lean * 0.82 * lp.t
        const ly = groundY - height * lp.t
        return (
          <g key={i} transform={`rotate(${lp.angle}, ${lx}, ${ly})`}>
            <ellipse
              cx={lx + lp.side * lp.w * 0.52}
              cy={ly - lp.h * 0.1}
              rx={lp.w * 0.5} ry={lp.h * 0.34}
              fill={`url(#${leafGradId})`}
              stroke="#1A5A28" strokeWidth={0.45} opacity={0.82}
            />
          </g>
        )
      })}

      {/* ── Archetype 0: classic daisy ── */}
      {archetype === 0 && (
        <g>
          {Array.from({ length: petalCount }, (_, i) => {
            const deg = (i / petalCount) * 360
            const rad = (deg * Math.PI) / 180
            const px = tipX + Math.cos(rad) * flowerR * 0.72
            const py = tipY + Math.sin(rad) * flowerR * 0.72
            return (
              <ellipse key={i}
                cx={px} cy={py}
                rx={flowerR * 0.44} ry={flowerR * 0.22}
                fill={`url(#${gradId})`}
                stroke={dark} strokeWidth={0.45}
                transform={`rotate(${deg}, ${px}, ${py})`}
                opacity={0.92}
              />
            )
          })}
          {/* center */}
          <circle cx={tipX} cy={tipY} r={flowerR * 0.3}
            fill={dark} opacity={0.9} />
        </g>
      )}

      {/* ── Archetype 1: full bloom (peony/poppy) ── */}
      {archetype === 1 && (
        <g>
          {/* outer petals */}
          {Array.from({ length: petalCount }, (_, i) => {
            const deg = (i / petalCount) * 360 + 10
            const rad = (deg * Math.PI) / 180
            const px = tipX + Math.cos(rad) * flowerR * 0.62
            const py = tipY + Math.sin(rad) * flowerR * 0.62
            return (
              <ellipse key={i}
                cx={px} cy={py}
                rx={flowerR * 0.52} ry={flowerR * 0.3}
                fill={mid} stroke={dark} strokeWidth={0.4}
                transform={`rotate(${deg}, ${px}, ${py})`}
                opacity={0.85}
              />
            )
          })}
          {/* inner petals */}
          {Array.from({ length: Math.ceil(petalCount * 0.7) }, (_, i) => {
            const deg = (i / Math.ceil(petalCount * 0.7)) * 360
            const rad = (deg * Math.PI) / 180
            const px = tipX + Math.cos(rad) * flowerR * 0.32
            const py = tipY + Math.sin(rad) * flowerR * 0.32
            return (
              <ellipse key={i}
                cx={px} cy={py}
                rx={flowerR * 0.35} ry={flowerR * 0.2}
                fill={`url(#${gradId})`} stroke={dark} strokeWidth={0.35}
                transform={`rotate(${deg}, ${px}, ${py})`}
                opacity={0.95}
              />
            )
          })}
          <circle cx={tipX} cy={tipY} r={flowerR * 0.18} fill={dark} opacity={0.85} />
        </g>
      )}

      {/* ── Archetype 2: wildflower cluster ── */}
      {archetype === 2 && (
        <g>
          {branchOffsets.map((b, i) => {
            const bx = tipX + b.dx
            const by = tipY + b.dy
            const isMain = i === 0
            return (
              <g key={i}>
                {/* branch stem */}
                {!isMain && (
                  <line
                    x1={tipX} y1={tipY + flowerR * 0.3}
                    x2={bx} y2={by}
                    stroke={dark} strokeWidth={0.65} opacity={0.55}
                    strokeLinecap="round"
                  />
                )}
                {/* small bloom */}
                <circle cx={bx} cy={by} r={b.r}
                  fill={i % 2 === 0 ? `url(#${gradId})` : mid}
                  stroke={dark} strokeWidth={0.5} opacity={0.88}
                />
                <circle cx={bx} cy={by} r={b.r * 0.28}
                  fill={dark} opacity={0.75}
                />
              </g>
            )
          })}
        </g>
      )}

      {/* Hover: label + dot indicator */}
      {hovered && (
        <>
          <line
            x1={tipX} y1={tipY - flowerR - 5}
            x2={tipX} y2={tipY - flowerR - 18}
            stroke={dark} strokeWidth={0.7} opacity={0.5}
          />
          <text
            x={tipX} y={tipY - flowerR - 22}
            textAnchor="middle" fontSize={10.5}
            fontFamily="Georgia, 'Times New Roman', serif"
            fontStyle="italic"
            fill={dark} opacity={0.9}
            style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}
          >
            {plant.ref.brand_name}
          </text>
        </>
      )}
    </g>
  )
}

// ── Connections ───────────────────────────────────────────────────────────────

function Connections({ plants }: { plants: PlantData[] }) {
  const pairs = useMemo(() => {
    const result: Array<{ a: PlantData; b: PlantData; key: string }> = []
    const perPlant = new Map<string, number>()
    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const ta = plants[i].ref.tags ?? [], tb = plants[j].ref.tags ?? []
        if (!ta.some(t => tb.includes(t))) continue
        const ia = perPlant.get(plants[i].ref.id) ?? 0
        const ib = perPlant.get(plants[j].ref.id) ?? 0
        if (ia >= 3 || ib >= 3) continue
        result.push({ a: plants[i], b: plants[j], key: `${i}-${j}` })
        perPlant.set(plants[i].ref.id, ia + 1)
        perPlant.set(plants[j].ref.id, ib + 1)
      }
    }
    return result
  }, [plants])

  return (
    <g>
      {pairs.map(({ a, b, key }) => {
        const ax = a.x + a.lean * 0.38, ay = a.groundY - a.height
        const bx = b.x + b.lean * 0.38, by = b.groundY - b.height
        const mx = (ax + bx) / 2, my = Math.min(ay, by) - 22
        return (
          <path key={key}
            d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`}
            stroke="#2D6E3A" strokeWidth={0.6} fill="none"
            opacity={0.18} strokeDasharray="2 7"
          />
        )
      })}
    </g>
  )
}

// ── Ground ────────────────────────────────────────────────────────────────────

function Ground({ W, Y }: { W: number; Y: number }) {
  const rng = seededRng('ground-v4')
  const tufts = Array.from({ length: 32 }, (_, i) => ({
    x: (i / 31) * W,
    h: 6 + rng() * 12,
    spread: 5 + rng() * 8,
    lean: (rng() - 0.5) * 6,
  }))

  return (
    <g>
      <line x1={0} y1={Y} x2={W} y2={Y} stroke="#2A2010" strokeWidth={1.0} opacity={0.25} />
      {tufts.map((t, i) => (
        <g key={i} opacity={0.45}>
          <line x1={t.x} y1={Y}
            x2={t.x - t.spread * 0.6 + t.lean} y2={Y - t.h}
            stroke="#2D6E3A" strokeWidth={0.9} strokeLinecap="round" />
          <line x1={t.x} y1={Y}
            x2={t.x + t.lean * 0.3} y2={Y - t.h * 1.1}
            stroke="#1A5A28" strokeWidth={1.0} strokeLinecap="round" />
          <line x1={t.x} y1={Y}
            x2={t.x + t.spread * 0.6 + t.lean} y2={Y - t.h * 0.85}
            stroke="#2D6E3A" strokeWidth={0.9} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

// ── Drifting leaves ───────────────────────────────────────────────────────────

function DriftingLeaves({ W, H }: { W: number; H: number }) {
  const leaves = useMemo(() => {
    const rng = seededRng('drift-v4')
    return Array.from({ length: 10 }, () => ({
      cx: rng() * W, cy: 60 + rng() * H * 0.5,
      size: 7 + rng() * 12,
      rot: rng() * 360,
      dur: 7 + rng() * 9,
      delay: rng() * 6,
      color: rng() > 0.5 ? '#5A8A3A' : '#8A5A3A',
    }))
  }, [W, H])

  return (
    <g>
      {leaves.map((l, i) => (
        <path key={i}
          d={`M ${l.cx} ${l.cy} Q ${l.cx + l.size} ${l.cy - l.size * 1.4} ${l.cx} ${l.cy - l.size * 2.8} Q ${l.cx - l.size} ${l.cy - l.size * 1.4} ${l.cx} ${l.cy} Z`}
          fill={l.color}
          transform={`rotate(${l.rot}, ${l.cx}, ${l.cy})`}
          opacity={0.22}
          style={{ animation: `float ${l.dur}s ease-in-out ${l.delay}s infinite alternate` }}
        />
      ))}
    </g>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const W = 1600
const H = 720
const GROUND_Y = 570

export default function GardenView({ references }: { references: Reference[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return references
    const q = query.toLowerCase()
    return references.filter(r =>
      r.brand_name.toLowerCase().includes(q) ||
      (r.content ?? '').toLowerCase().includes(q) ||
      (r.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
      (r.industry ?? '').toLowerCase().includes(q)
    )
  }, [references, query])

  const scale = Math.max(0.42, 1.0 - Math.max(0, filtered.length - 5) * 0.011)

  const plants = useMemo(() => {
    const n = filtered.length
    if (n === 0) return []
    const margin = 80
    const slot = (W - margin * 2) / Math.max(n, 1)
    return filtered.map((ref, i) => {
      const rng = seededRng(ref.id + 'pos3')
      const x = Math.max(60, Math.min(W - 60,
        margin + slot * i + slot * 0.5 + (rng() - 0.5) * slot * 0.5))
      const gY = GROUND_Y + (rng() - 0.5) * 24
      return buildPlant(ref, x, gY, scale)
    })
  }, [filtered, scale])

  const handleClick = useCallback((slug: string) => {
    window.location.href = `/ref/${slug}`
  }, [])

  return (
    <div className="gv-root">
      {/* Header */}
      <header className="gv-header">
        <Link href="/garden" className="gv-logo">Gardenn</Link>
        <span className="gv-count">
          {filtered.length === references.length
            ? `${references.length} ideia${references.length !== 1 ? 's' : ''}`
            : `${filtered.length} / ${references.length}`}
        </span>
        <Link href="/admin" className="gv-admin">admin</Link>
      </header>

      {/* SVG canvas */}
      <div className="gv-canvas-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="gv-svg">
          {/* Background */}
          <rect width={W} height={H} fill="#FAF8F4" />

          {/* Drifting leaves */}
          <DriftingLeaves W={W} H={H} />

          {/* Connections */}
          <Connections plants={plants} />

          {/* Plants — hovered last (on top) */}
          {plants.filter(p => p.ref.id !== hoveredId).map(p => (
            <Plant key={p.ref.id} plant={p} hovered={false}
              onClick={() => handleClick(p.ref.slug)} onHover={setHoveredId} />
          ))}
          {plants.filter(p => p.ref.id === hoveredId).map(p => (
            <Plant key={p.ref.id} plant={p} hovered
              onClick={() => handleClick(p.ref.slug)} onHover={setHoveredId} />
          ))}

          {/* Ground */}
          <Ground W={W} Y={GROUND_Y} />

          {/* Empty state */}
          {plants.length === 0 && (
            <text x={W / 2} y={GROUND_Y - 60} textAnchor="middle"
              fontSize={13} fontFamily="Georgia, serif" fontStyle="italic"
              fill="#6A5A4A" opacity={0.5}>
              o jardim está vazio — adicione ideias no admin
            </text>
          )}
        </svg>
      </div>

      {/* Search bar */}
      <div className="gv-bar-wrap">
        <div className="gv-bar">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="gv-search-icon">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} className="gv-input"
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="buscar por nome, tema, tag…" />
          {query && (
            <button className="gv-clear" onClick={() => setQuery('')}>×</button>
          )}
          <Link href="/admin/nova" className="gv-add" title="Plantar nova ideia">+</Link>
        </div>
      </div>

      <style jsx>{`
        .gv-root {
          min-height: 100vh;
          background: #FAF8F4;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .gv-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px; height: 44px;
          background: rgba(250, 248, 244, 0.9);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(42, 32, 16, 0.1);
        }
        .gv-logo {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px; font-style: italic;
          color: #2A2010; text-decoration: none; letter-spacing: 0.01em;
        }
        .gv-count {
          font-size: 11px; color: #8A7A5A; letter-spacing: 0.08em;
          font-family: system-ui, sans-serif;
        }
        .gv-admin {
          font-size: 11px; color: #8A7A5A; text-decoration: none;
          letter-spacing: 0.08em; font-family: system-ui, sans-serif;
          transition: color 0.2s;
        }
        .gv-admin:hover { color: #2A2010; }
        .gv-canvas-wrap {
          flex: 1; display: flex; align-items: flex-end; padding-top: 44px;
        }
        .gv-svg {
          width: 100%; height: calc(100vh - 44px); display: block;
        }
        .gv-bar-wrap {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 50;
        }
        .gv-bar {
          display: flex; align-items: center; gap: 10px;
          background: #FDFCFA;
          border: 1px solid rgba(42, 32, 16, 0.15);
          border-radius: 40px; padding: 10px 16px;
          box-shadow: 0 2px 16px rgba(42, 32, 16, 0.08);
          min-width: 300px;
        }
        .gv-search-icon { color: #8A7A5A; flex-shrink: 0; }
        .gv-input {
          flex: 1; border: none; outline: none;
          font-size: 13px; color: #2A2010;
          background: transparent; min-width: 0;
          font-family: system-ui, sans-serif;
        }
        .gv-input::placeholder { color: #B0A080; }
        .gv-clear {
          background: none; border: none; cursor: pointer;
          color: #B0A080; font-size: 17px; line-height: 1; padding: 0;
        }
        .gv-clear:hover { color: #2A2010; }
        .gv-add {
          width: 27px; height: 27px; border-radius: 50%;
          background: #2A2010;
          color: #FAF8F4; display: flex; align-items: center; justify-content: center;
          font-size: 18px; line-height: 1; text-decoration: none;
          flex-shrink: 0; font-weight: 300; transition: background 0.2s;
        }
        .gv-add:hover { background: #4A3820; }
      `}</style>
    </div>
  )
}
