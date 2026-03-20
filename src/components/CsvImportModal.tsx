import { useState, useRef, ChangeEvent } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Priority } from '@/lib/types'

interface CsvImportModalProps {
  conferenceId: string
  onClose: () => void
  onSuccess: (count: number) => void
}

interface ParsedRow {
  first_name: string
  last_name: string
  company: string
  role: string
  phone: string
  email: string
  linkedin_url: string
  photo_url: string
  priority: Priority
  pre_notes: string
}

interface ParseError {
  row: number
  message: string
}

function mapPriority(raw: string): Priority {
  const val = (raw || '').toLowerCase().trim()
  if (val === 'must meet' || val === 'must_meet' || val === '1') return 'must_meet'
  if (val === 'should meet' || val === 'should_meet' || val === '2') return 'should_meet'
  return 'nice_to_have'
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, '_')
}

const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  first_name: 'first_name',
  'first name': 'first_name',
  firstname: 'first_name',
  last_name: 'last_name',
  'last name': 'last_name',
  lastname: 'last_name',
  company: 'company',
  organization: 'company',
  role: 'role',
  title: 'role',
  'job title': 'role',
  phone: 'phone',
  telephone: 'phone',
  email: 'email',
  'email address': 'email',
  linkedin_url: 'linkedin_url',
  linkedin: 'linkedin_url',
  'linkedin url': 'linkedin_url',
  photo_url: 'photo_url',
  photo: 'photo_url',
  'photo url': 'photo_url',
  priority: 'priority',
  pre_notes: 'pre_notes',
  notes: 'pre_notes',
  note: 'pre_notes',
}

function parseCsv(text: string): { rows: ParsedRow[]; errors: ParseError[] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }] }
  }

  const headerLine = lines[0]
  const rawHeaders = headerLine.split(',').map(h => h.replace(/^["']|["']$/g, '').trim())
  const fieldMap: Record<number, keyof ParsedRow> = {}

  rawHeaders.forEach((h, i) => {
    const normalized = normalizeHeader(h)
    if (COLUMN_MAP[normalized]) {
      fieldMap[i] = COLUMN_MAP[normalized]
    }
  })

  const rows: ParsedRow[] = []
  const errors: ParseError[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Simple CSV parse (handles quoted fields)
    const values: string[] = []
    let inQuote = false
    let current = ''
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]
      if (ch === '"' || ch === "'") {
        inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())

    const row: Partial<ParsedRow> = {
      first_name: '',
      last_name: '',
      company: '',
      role: '',
      phone: '',
      email: '',
      linkedin_url: '',
      photo_url: '',
      priority: 'nice_to_have',
      pre_notes: '',
    }

    Object.entries(fieldMap).forEach(([idx, field]) => {
      const val = (values[parseInt(idx)] || '').replace(/^["']|["']$/g, '').trim()
      if (field === 'priority') {
        row.priority = mapPriority(val)
      } else {
        (row as Record<string, string>)[field] = val
      }
    })

    if (!row.first_name && !row.last_name) {
      errors.push({ row: i, message: `Row ${i}: missing first_name and last_name` })
      continue
    }

    rows.push(row as ParsedRow)
  }

  return { rows, errors }
}

export function CsvImportModal({ conferenceId, onClose, onSuccess }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<ParseError[]>([])
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    setCsvText(text)
    if (text.trim()) {
      const { rows, errors } = parseCsv(text)
      setParsedRows(rows)
      setParseErrors(errors)
    } else {
      setParsedRows([])
      setParseErrors([])
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      const { rows, errors } = parseCsv(text)
      setParsedRows(rows)
      setParseErrors(errors)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (parsedRows.length === 0) return
    setImporting(true)
    setImportErrors([])

    const inserts = parsedRows.map(row => ({
      conference_id: conferenceId,
      first_name: row.first_name,
      last_name: row.last_name,
      company: row.company,
      role: row.role || null,
      phone: row.phone || null,
      email: row.email || null,
      linkedin_url: row.linkedin_url || null,
      photo_url: row.photo_url || null,
      priority: row.priority,
      pre_notes: row.pre_notes || null,
    }))

    const { error } = await supabase.from('conference_targets').insert(inserts)

    if (error) {
      setImportErrors([error.message])
      setImporting(false)
      return
    }

    setImporting(false)
    onSuccess(parsedRows.length)
  }

  const previewRows = parsedRows.slice(0, 5)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl bg-slate-900 rounded-t-2xl border border-slate-700 max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Import CSV</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* File upload */}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-600 rounded-xl py-3 text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              Upload .csv file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Or paste CSV data</label>
            <textarea
              value={csvText}
              onChange={handleTextChange}
              placeholder={`first_name,last_name,company,role,email,priority\nJane,Doe,Acme Corp,CTO,jane@acme.com,must_meet`}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Column hint */}
          <p className="text-xs text-slate-500">
            Supported columns: first_name, last_name, company, role, phone, email, linkedin_url, photo_url, priority, notes
          </p>
          <p className="text-xs text-slate-500">
            Priority values: "must meet" / "must_meet" / "1", "should meet" / "should_meet" / "2", everything else → Nice to Have
          </p>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1">
              {parseErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Import errors */}
          {importErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-xs font-medium mb-1">Import failed</p>
              {importErrors.map((err, i) => (
                <p key={i} className="text-red-400 text-xs">{err}</p>
              ))}
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Preview — first {Math.min(5, parsedRows.length)} of {parsedRows.length} rows
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Name</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Company</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Role</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-white">
                          {row.first_name} {row.last_name}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{row.company || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{row.role || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            row.priority === 'must_meet'
                              ? 'bg-red-500/20 text-red-400'
                              : row.priority === 'should_meet'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {row.priority === 'must_meet' ? 'Must' : row.priority === 'should_meet' ? 'Should' : 'Nice'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-xs text-slate-500 mt-1.5">+{parsedRows.length - 5} more rows not shown</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={handleImport}
            disabled={parsedRows.length === 0 || importing}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {importing ? 'Importing...' : `Import ${parsedRows.length} target${parsedRows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
