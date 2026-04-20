#!/usr/bin/env node
/**
 * Conference App — Data Export Script
 * Exports all data to CSV files in the exports/ directory.
 *
 * Usage:
 *   node scripts/export.mjs
 *
 * Requires SUPABASE_SERVICE_KEY in .env (bypasses RLS).
 * Find it at: Supabase Dashboard → Settings → API → service_role key.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load .env manually (no dotenv dependency)
try {
  const raw = readFileSync(join(ROOT, '.env'), 'utf-8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://byfwmtdreeegtngcbkpr.supabase.co'

// Service role key bypasses RLS — add to .env as SUPABASE_SERVICE_KEY
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!KEY) {
  console.error('❌ No key found. Add SUPABASE_SERVICE_KEY to your .env file.')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn(
    '⚠️  Using anon key — data may be empty due to RLS.\n' +
      '   Add SUPABASE_SERVICE_KEY to .env for a full export.\n' +
      '   (Supabase Dashboard → Settings → API → service_role)\n'
  )
}

const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

function esc(val) {
  if (val === null || val === undefined) return ''
  const str = Array.isArray(val) ? val.join('; ') : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows, columns) {
  const header = columns.join(',')
  const lines = rows.map((row) => columns.map((col) => esc(row[col])).join(','))
  return [header, ...lines].join('\n')
}

function write(filename, content) {
  const dir = join(ROOT, 'exports')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, filename), content, 'utf-8')
  console.log(`  ✅ ${filename} (${content.split('\n').length - 1} rows)`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📦 Conference App — Data Export\n')
  console.log('Fetching from Supabase...')

  const [conferences, profiles, targets, interactions] = await Promise.all([
    fetchAll('conference_conferences'),
    fetchAll('conference_profiles'),
    fetchAll('conference_targets'),
    fetchAll('conference_interactions'),
  ])

  console.log(
    `  → ${conferences.length} conferences, ${profiles.length} profiles, ` +
      `${targets.length} targets, ${interactions.length} interactions\n`
  )

  const confById = Object.fromEntries(conferences.map((c) => [c.id, c]))
  const profById = Object.fromEntries(profiles.map((p) => [p.id, p]))
  const targetById = Object.fromEntries(targets.map((t) => [t.id, t]))

  // ── targets.csv ──────────────────────────────────────────────────────────
  const targetRows = targets.map((t) => ({
    conference: confById[t.conference_id]?.name ?? t.conference_id,
    first_name: t.first_name,
    last_name: t.last_name,
    company: t.company,
    role: t.role,
    email: t.email,
    phone: t.phone,
    priority: t.priority,
    company_status: t.company_status,
    contacted: t.contacted,
    pre_notes: t.pre_notes,
    tags: t.tags,
    booth_number: t.booth_number,
    linkedin_url: t.linkedin_url,
    added_by_name: profById[t.added_by]?.name ?? t.added_by ?? '',
    created_at: t.created_at,
  }))

  write(
    'targets.csv',
    toCsv(targetRows, [
      'conference',
      'first_name',
      'last_name',
      'company',
      'role',
      'email',
      'phone',
      'priority',
      'company_status',
      'contacted',
      'pre_notes',
      'tags',
      'booth_number',
      'linkedin_url',
      'added_by_name',
      'created_at',
    ])
  )

  // ── interactions.csv ─────────────────────────────────────────────────────
  const interactionRows = interactions.map((i) => {
    const target = targetById[i.target_id]
    const conf = target ? confById[target.conference_id] : null
    const rep = profById[i.user_id]
    return {
      conference: conf?.name ?? '',
      target_first_name: target?.first_name ?? '',
      target_last_name: target?.last_name ?? '',
      target_company: target?.company ?? '',
      target_priority: target?.priority ?? '',
      rep_name: rep?.name ?? i.user_id,
      status: i.status,
      score: i.score,
      notes: i.notes,
      follow_up: i.follow_up,
      met_at: i.met_at,
      created_at: i.created_at,
    }
  })

  write(
    'interactions.csv',
    toCsv(interactionRows, [
      'conference',
      'target_first_name',
      'target_last_name',
      'target_company',
      'target_priority',
      'rep_name',
      'status',
      'score',
      'notes',
      'follow_up',
      'met_at',
      'created_at',
    ])
  )

  // ── profiles.csv ─────────────────────────────────────────────────────────
  write('profiles.csv', toCsv(profiles, ['name', 'email', 'role', 'lifetime_score', 'created_at']))

  console.log('\n✅ Export complete → exports/')
}

main().catch((err) => {
  console.error('❌ Export failed:', err.message)
  process.exit(1)
})
