'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Reference } from '@/lib/types'
import { CATEGORIES } from '@/lib/constants'

// ── Seeded RNG (deterministic per-plant shapes) ──────────────────────────────

function seededRng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  }
  return () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5
    return (h >>> 0) / 0x100000000
  }
}

// ── Color palette per category ───────────────────────────────────────────────

const PALETTE: Record<string, { stem: string; leaf: string; flower: string; glow: string }> = {
  'manifesto':         { stem: '#5D4037', leaf: '#2E7D32', flower: '#E91E63', glow: '#F48FB1' },
  'identidade-verbal': { stem: '#4E342E', leaf: '#388E3C', flower: '#FF8F00', glow: '#FFD54F' },
  'copywriting':       { stem: '#3E2723', leaf: '#1B5E20', flower: '#00BCD4', glow: '#80DEEA' },
  'poesia':            { stem: '#6D4C41', leaf: '#43A047', flower: '#AB47BC', glow: '#CE93D8' },
  'email':             { stem: '#5D4037', leaf: '#2E7D32', flower: '#1E88E5', glow: '#90CAF9' },
  'naming':            { stem: '#4E342E', leaf: '#33691E', flower: '#F4511E', glow: '#FFAB91' },
  'ooh':               { stem: '#6D4C41', leaf: '#4CAF50', flower: '#D81B60', glow: '#F48FB1' },
}

const DEFAULT_PALETTE = PALETTE['poesia']

// ── Plant data ───────────────────────────────────────────────────────────────

type PlantData = {
  ref: Reference
  x: number
  groundY: number
  scale: number
  height: number
  lean: number
  archetype: number
  animDelay: number
  animDuration: number
  leafPositions: { t: number; side: -1 | 1; w: number; h: number }[]
  flowerR: number
  petalCount: number
  blobs: { dx: number; dy: number; r: number }[]
}

function buildPlant(ref: Reference, x: number, groundY: number, scale: number): PlantData {
  const rng = seededRng(ref.id)
  const archetype = Math.floor(rng() * 3) // 0=simple bloom, 1=multi-petal, 2=bush
  const height = (65 + rng() * 110) * scale
  const lean = (rng() - 0.5) * 55
  const leafCount = 2 + Math.floor(rng() * 3)
  const leafPositions = Array.from({ length: leafCount }, () => ({
    t: 0.2 + rng() * 0.58,
    side: (rng() > 0.5 ? 1 : -1) as -1 | 1,
    w: (18 + rng() * 28) * scale,
    h: (9 + rng() * 14) * scale,
  }))
  const flowerR = (11 + rng() * 19) * scale
  const petalCount = 5 + Math.floor(rng() * 4)
  const blobCount = 3 + Math.floor(rng() * 5)
  const blobs = Array.from({ length: blobCount }, () => ({
    dx: (rng() - 0.5) * flowerR * 3,
    dy: (rng() - 0.5) * flowerR * 1.8,
    r: flowerR * (0.35 + rng() * 0.75),
  }))
  return {
    ref, x, groundY, scale,
    height, lean, archetype,
    animDelay: rng() * 5,
    animDuration: 2.5 + rng() * 3.5,
    leafPositions, flowerR, petalCount, blobs,
  }
}

// ── Single plant SVG ─────────────────────────────────────────────────────────

function Plant({
  plant, hovered, onClick, onHover,
}: {
  plant: PlantData
  hovered: boolean
  onClick: () => void
  onHover: (id: string | null) => void
}) {
  const c = PALETTE[plant.ref.category] ?? DEFAULT_PALETTE
  const { x, groundY, height, lean, leafPositions, flowerR, petalCount, blobs, animDelay, animDuration, archetype } = plant

  const tipX = x + lean * 0.4
  const tipY = groundY - height
  const ctrlX = x + lean * 0.85
  const ctrlY = groundY - height * 0.52

  return (
    <g
      style={{
        transformOrigin: `${x}px ${groundY}px`,
        animation: `plantSway ${animDuration}s ease-in-out ${animDelay}s infinite alternate`,
        cursor: 'pointer',
      }}
      onMouseEnter={() => onHover(plant.ref.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Stem */}
      <path
        d={`M ${x} ${groundY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
        stroke={c.stem}
        strokeWidth={hovered ? 2.5 : 1.8}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Leaves */}
      {leafPositions.map((lp, i) => {
        const lx = x + lean * 0.85 * lp.t
        const ly = groundY - height * lp.t
        return (
          <ellipse
            key={i}
            cx={lx + lp.side * lp.w * 0.52}
            cy={ly - lp.h * 0.15}
            rx={lp.w * 0.52}
            ry={lp.h * 0.38}
            fill={c.leaf}
            transform={`rotate(${lp.side * 38}, ${lx}, ${ly})`}
            opacity={hovered ? 0.95 : 0.8}
          />
        )
      })}

      {/* Glow behind flower when hovered */}
      {hovered && (
        <circle cx={tipX} cy={tipY} r={flowerR * 2.2} fill={c.glow} opacity={0.22} />
      )}

      {/* Archetype 0: simple circle bloom */}
      {archetype === 0 && (
        <>
          <circle cx={tipX} cy={tipY} r={flowerR} fill={c.flower} opacity={hovered ? 1 : 0.88} />
          <circle cx={tipX} cy={tipY} r={flowerR * 0.36} fill={c.stem} opacity={0.75} />
        </>
      )}

      {/* Archetype 1: multi-petal */}
      {archetype === 1 && (
        <>
          {Array.from({ length: petalCount }, (_, i) => {
            const deg = (i / petalCount) * 360
            const rad = (deg * Math.PI) / 180
            const px = tipX + Math.cos(rad) * flowerR * 0.78
            const py = tipY + Math.sin(rad) * flowerR * 0.78
            return (
              <ellipse
                key={i}
                cx={px}
                cy={py}
                rx={flowerR * 0.52}
                ry={flowerR * 0.26}
                fill={c.flower}
                transform={`rotate(${deg}, ${px}, ${py})`}
                opacity={hovered ? 0.92 : 0.82}
              />
            )
          })}
          <circle cx={tipX} cy={tipY} r={flowerR * 0.42} fill={c.stem} opacity={0.8} />
        </>
      )}

      {/* Archetype 2: bush blob cluster */}
      {archetype === 2 &&
        blobs.map((b, i) => (
          <circle
            key={i}
            cx={tipX + b.dx}
            cy={tipY + b.dy}
            r={b.r}
            fill={c.flower}
            opacity={hovered ? 0.88 : 0.72 + i * 0.02}
          />
        ))}

      {/* Hover label */}
      {hovered && (
        <text
          x={tipX}
          y={tipY - flowerR - 10}
          textAnchor="middle"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
          fill={c.flower}
          style={{ pointerEvents: 'none' }}
        >
          {plant.ref.brand_name}
        </text>
      )}
    </g>
  )
}

// ── Connection lines (shared tags) ───────────────────────────────────────────

function Connections({ plants }: { plants: PlantData[] }) {
  const pairs = useMemo(() => {
    const result: Array<{ a: PlantData; b: PlantData; key: string }> = []
    const perPlant = new Map<string, number>()

    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const tagsA = plants[i].ref.tags ?? []
        const tagsB = plants[j].ref.tags ?? []
        if (tagsA.length === 0 || tagsB.length === 0) continue
        const shared = tagsA.some(t => tagsB.includes(t))
        if (!shared) continue

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
        const ax = a.x + a.lean * 0.4
        const ay = a.groundY - a.height
        const bx = b.x + b.lean * 0.4
        const by = b.groundY - b.height
        const mx = (ax + bx) / 2
        const my = Math.min(ay, by) - 25
        return (
          <path
            key={key}
            d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`}
            stroke="#5D8A3C"
            strokeWidth={0.9}
            fill="none"
            opacity={0.28}
            strokeDasharray="3 5"
          />
        )
      })}
    </g>
  )
}

// ── Garden ground grass tufts ─────────────────────────────────────────────────

function GrassTufts({ W, groundY }: { W: number; groundY: number }) {
  const tufts = useMemo(() => {
    const rng = seededRng('grass-tufts-static')
    return Array.from({ length: 28 }, (_, i) => ({
      x: (i / 27) * W * 0.98 + W * 0.01,
      y: groundY + (rng() - 0.5) * 18,
      h: 8 + rng() * 14,
      spread: 6 + rng() * 10,
    }))
  }, [W, groundY])

  return (
    <g opacity={0.55}>
      {tufts.map((t, i) => (
        <g key={i}>
          <path
            d={`M ${t.x} ${t.y} Q ${t.x - t.spread * 0.4} ${t.y - t.h * 0.7} ${t.x - t.spread * 0.8} ${t.y - t.h}`}
            stroke="#4CAF50" strokeWidth={1.2} fill="none" strokeLinecap="round"
          />
          <path
            d={`M ${t.x} ${t.y} Q ${t.x} ${t.y - t.h * 0.85} ${t.x} ${t.y - t.h}`}
            stroke="#388E3C" strokeWidth={1.4} fill="none" strokeLinecap="round"
          />
          <path
            d={`M ${t.x} ${t.y} Q ${t.x + t.spread * 0.4} ${t.y - t.h * 0.7} ${t.x + t.spread * 0.8} ${t.y - t.h}`}
            stroke="#4CAF50" strokeWidth={1.2} fill="none" strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  )
}

// ── Main GardenView ───────────────────────────────────────────────────────────

const W = 1600
const H = 720
const GROUND_Y = 560

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
    const margin = 90
    const slot = (W - margin * 2) / Math.max(n, 1)
    return filtered.map((ref, i) => {
      const rng = seededRng(ref.id + 'xy')
      const baseX = margin + slot * i + slot * 0.5
      const jitter = (rng() - 0.5) * slot * 0.55
      const x = Math.max(55, Math.min(W - 55, baseX + jitter))
      const gY = GROUND_Y + (rng() - 0.5) * 28
      return buildPlant(ref, x, gY, scale)
    })
  }, [filtered, scale])

  const handlePlantClick = useCallback((slug: string) => {
    window.location.href = `/ref/${slug}`
  }, [])

  return (
    <div className="garden-root">
      {/* Top bar */}
      <div className="garden-header">
        <Link href="/" className="garden-back">
          ← lista
        </Link>
        <span className="garden-title">GARDENN</span>
        <span className="garden-count">
          {filtered.length === references.length
            ? `${references.length} ideia${references.length !== 1 ? 's' : ''}`
            : `${filtered.length} de ${references.length}`}
        </span>
      </div>

      {/* SVG canvas */}
      <div className="garden-canvas-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMax meet"
          className="garden-svg"
        >
          <defs>
            <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#E8F5E9" />
              <stop offset="65%"  stopColor="#F1F8E9" />
              <stop offset="100%" stopColor="#DCEDC8" />
            </linearGradient>
            <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#A5D6A7" />
              <stop offset="50%"  stopColor="#66BB6A" />
              <stop offset="100%" stopColor="#388E3C" />
            </linearGradient>
            <radialGradient id="gSun" cx="15%" cy="12%" r="25%">
              <stop offset="0%"   stopColor="#FFFDE7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#E8F5E9" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sky */}
          <rect width={W} height={H} fill="url(#gSky)" />
          <rect width={W} height={H} fill="url(#gSun)" />

          {/* Ground curve */}
          <path
            d={`M 0 ${GROUND_Y - 18} Q ${W * 0.25} ${GROUND_Y - 34} ${W * 0.5} ${GROUND_Y - 22} Q ${W * 0.75} ${GROUND_Y - 10} ${W} ${GROUND_Y - 20} L ${W} ${H} L 0 ${H} Z`}
            fill="url(#gGround)"
          />

          {/* Grass */}
          <GrassTufts W={W} groundY={GROUND_Y} />

          {/* Connection vines */}
          <Connections plants={plants} />

          {/* Plants — render hovered last so it's on top */}
          {plants
            .filter(p => p.ref.id !== hoveredId)
            .map(p => (
              <Plant
                key={p.ref.id}
                plant={p}
                hovered={false}
                onClick={() => handlePlantClick(p.ref.slug)}
                onHover={setHoveredId}
              />
            ))}
          {plants
            .filter(p => p.ref.id === hoveredId)
            .map(p => (
              <Plant
                key={p.ref.id}
                plant={p}
                hovered
                onClick={() => handlePlantClick(p.ref.slug)}
                onHover={setHoveredId}
              />
            ))}

          {/* Empty state */}
          {plants.length === 0 && (
            <text
              x={W / 2}
              y={GROUND_Y - 60}
              textAnchor="middle"
              fontSize={15}
              fontFamily="system-ui, sans-serif"
              fill="#5D4037"
              opacity={0.5}
            >
              Nenhuma ideia encontrada. Plante a primeira no admin.
            </text>
          )}
        </svg>
      </div>

      {/* Floating search/filter bar */}
      <div className="garden-bar-wrap">
        <div className="garden-bar">
          <button
            className="garden-bar-icon"
            onClick={() => inputRef.current?.focus()}
            aria-label="Buscar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <input
            ref={inputRef}
            className="garden-bar-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="buscar por nome, tema, tag…"
          />
          {query && (
            <button
              className="garden-bar-clear"
              onClick={() => setQuery('')}
              aria-label="Limpar"
            >
              ×
            </button>
          )}
          <Link href="/admin/nova" className="garden-bar-add" title="Adicionar ideia">
            +
          </Link>
        </div>
      </div>

      <style jsx>{`
        .garden-root {
          min-height: 100vh;
          background: #E8F5E9;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .garden-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 44px;
          background: rgba(232, 245, 233, 0.85);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(76, 175, 80, 0.2);
        }
        .garden-back {
          font-size: 12px;
          color: #4CAF50;
          text-decoration: none;
          letter-spacing: 0.04em;
          font-weight: 500;
        }
        .garden-back:hover { text-decoration: underline; }
        .garden-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: #2E7D32;
          text-transform: uppercase;
        }
        .garden-count {
          font-size: 11px;
          color: #81C784;
          letter-spacing: 0.04em;
        }
        .garden-canvas-wrap {
          flex: 1;
          display: flex;
          align-items: flex-end;
          padding-top: 44px;
        }
        .garden-svg {
          width: 100%;
          height: calc(100vh - 44px);
          display: block;
        }
        .garden-bar-wrap {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
        }
        .garden-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border-radius: 40px;
          padding: 9px 14px;
          box-shadow: 0 4px 24px rgba(46, 125, 50, 0.18), 0 1px 4px rgba(0,0,0,0.08);
          min-width: 300px;
        }
        .garden-bar-icon {
          color: #81C784;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .garden-bar-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 13px;
          color: #2E7D32;
          background: transparent;
          min-width: 0;
        }
        .garden-bar-input::placeholder { color: #A5D6A7; }
        .garden-bar-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: #A5D6A7;
          font-size: 16px;
          line-height: 1;
          padding: 0;
          flex-shrink: 0;
        }
        .garden-bar-clear:hover { color: #4CAF50; }
        .garden-bar-add {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #4CAF50;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          line-height: 1;
          text-decoration: none;
          flex-shrink: 0;
          font-weight: 300;
          transition: background 0.2s;
        }
        .garden-bar-add:hover { background: #388E3C; }
      `}</style>
    </div>
  )
}
