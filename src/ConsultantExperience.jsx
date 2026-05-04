import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
import './ConsultantExperience.css'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  HardDrive,
  Lock,
  MessagesSquare,
  Play,
  Plus,
  RefreshCcw,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'

const API_BASE = 'http://localhost:3001'
const INR_RATE = 83

const STAGES = [
  { id: 'welcome',   label: 'Welcome' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'thinking',  label: 'Generation' },
  { id: 'proposal',  label: 'Proposal' },
  { id: 'preview',   label: 'Safety Check' },
  { id: 'deploy',    label: 'Build' },
  { id: 'success',   label: 'Control Center' },
]

const CODE_TABS = [
  { id: 'terraform',  label: 'Terraform' },
  { id: 'dockerfile', label: 'Dockerfile' },
  { id: 'pipeline',   label: 'CI/CD' },
  { id: 'kubernetes', label: 'Kubernetes' },
]

const THINKING_LINES = [
  'Understanding your business model…',
  'Drafting cloud architecture…',
  'Generating infrastructure code…',
  'Sketching your architecture map…',
  'Finalising your proposal…',
]

// ── preset test cases so users can generate multiple builds quickly ──────────
const QUICK_PRESETS = [
  { label: 'Dental Clinic', prompt: 'I run a dental clinic and want a website where patients can book appointments online. We see about 50 patients a day and need to store patient records securely.' },
  { label: 'E-Commerce Store', prompt: 'I have an online clothing store selling 500+ products. We get high traffic on weekends and need a cart, payments, and order history.' },
  { label: 'SaaS App', prompt: 'I am launching a project management SaaS app for small teams. Expecting around 2000 users initially, needs real-time updates and a PostgreSQL database.' },
  { label: 'Restaurant Chain', prompt: 'We have 5 restaurant locations and need an online ordering and reservation system. Customers should be able to track their orders in real time.' },
  { label: 'School Portal', prompt: 'I manage a school with 800 students and need a portal for assignments, attendance, fee payments, and parent communication.' },
  { label: 'Hotel Booking', prompt: 'We run a boutique hotel with 40 rooms. Need an online booking engine, room availability calendar, and payment integration.' },
]

let mermaidReady = false

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function cls(...p) { return p.filter(Boolean).join(' ') }

// ── API helpers ──────────────────────────────────────────────────────────────
async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || data.details || `Request failed: ${path}`)
  return data
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`)
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${path}`)
  return data
}

async function streamConsultantMessage({ message, history = [], currentConfig }) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, currentConfig, model: 'llama3' }),
  })
  if (!res.ok || !res.body) throw new Error(`Consultant request failed with status ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
      try {
        const p = JSON.parse(line.slice(6))
        if (p.error) throw new Error(p.error)
        if (p.token) full += p.token
      } catch (e) {
        if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) throw e
      }
    }
  }
  return full.trim()
}

// ── Domain / label inference ─────────────────────────────────────────────────
function inferDomain(text = '', bizType = 'custom') {
  const t = text.toLowerCase()
  if (/(clinic|dental|hospital|patient|doctor)/.test(t)) return 'Clinic'
  if (/(bakery|cake|bread|pastry)/.test(t)) return 'Bakery'
  if (/(restaurant|cafe|coffee|food|menu)/.test(t)) return 'Restaurant'
  if (/(salon|spa|beauty)/.test(t)) return 'Salon'
  if (/(hotel|resort|stay|guest)/.test(t)) return 'Hotel'
  if (/(school|college|course|learning|education)/.test(t)) return 'School'
  if (/(shop|store|ecommerce|retail|clothing)/.test(t)) return 'Store'
  if (/(saas|software|app|platform|dashboard)/.test(t)) return 'SaaS'
  if (bizType === 'booking') return 'Business'
  if (bizType === 'website') return 'Brand'
  if (bizType === 'app') return 'App'
  if (bizType === 'store') return 'Store'
  return 'Business'
}

function getFriendlyLabels(domain) {
  const map = {
    Clinic:     { app: 'Clinic Web Server', db: 'Patient Records Vault', lb: 'Appointment Queue', backup: 'Nightly Backups', monitor: 'Health Watch', cdn: 'Fast Delivery Hubs' },
    Bakery:     { app: 'Bakery Web Server', db: 'Recipe & Order Ledger', lb: 'Rush Hour Queue', backup: 'Order Backups', monitor: 'Kitchen Watch', cdn: 'Nearby Delivery Hubs' },
    Restaurant: { app: 'Restaurant Server', db: 'Menu & Order Ledger', lb: 'Dining Queue', backup: 'Nightly Backups', monitor: 'Service Watch', cdn: 'Delivery Hubs' },
    Hotel:      { app: 'Booking Engine', db: 'Reservations Vault', lb: 'Check-in Queue', backup: 'Booking Backups', monitor: 'Occupancy Watch', cdn: 'Global CDN' },
    School:     { app: 'Portal Server', db: 'Student Records', lb: 'Request Queue', backup: 'Student Backups', monitor: 'Portal Watch', cdn: 'Content Delivery' },
    Store:      { app: 'Storefront Engine', db: 'Order Ledger', lb: 'Peak Traffic Queue', backup: 'Order Backups', monitor: 'Sales Watch', cdn: 'Fast Delivery Hubs' },
    SaaS:       { app: 'App Server', db: 'User Data Store', lb: 'Load Balancer', backup: 'Data Backups', monitor: 'Uptime Watch', cdn: 'Global CDN' },
    Salon:      { app: 'Booking Server', db: 'Client Records', lb: 'Request Queue', backup: 'Client Backups', monitor: 'Salon Watch', cdn: 'Delivery Hubs' },
  }
  return map[domain] || { app: `${domain} Web Server`, db: 'Secure Data Vault', lb: 'Queue Manager', backup: 'Nightly Backups', monitor: 'Health Watch', cdn: 'Fast Delivery Hubs' }
}

function buildDiagram(labels, includeData = true) {
  return `graph TD
    V[Your Customers]:::user
    CDN[${labels.cdn}]:::cdn
    LB(${labels.lb}):::lb
    App[${labels.app}]:::app
    Mon[${labels.monitor}]:::mon
    ${includeData ? `DB[(${labels.db})]:::db\n    BK[(${labels.backup})]:::bk` : ''}
    V --> CDN --> App
    V --> LB --> App
    App --> Mon
    ${includeData ? 'App --> DB --> BK' : ''}
    linkStyle default stroke:#A2611B,stroke-width:2.2px
    classDef user fill:#1F6B4F,stroke:#17533D,color:#F8FAFC,stroke-width:2px,font-weight:700,rx:8
    classDef cdn  fill:#B8742B,stroke:#8B5A21,color:#F8FAFC,stroke-width:2px,font-weight:700
    classDef lb   fill:#324B67,stroke:#273B52,color:#F8FAFC,stroke-width:2px,font-weight:700
    classDef app  fill:#176048,stroke:#124A38,color:#F8FAFC,stroke-width:2px,font-weight:700
    classDef mon  fill:#495E77,stroke:#394A5E,color:#F8FAFC,stroke-width:2px,font-weight:700
    classDef db   fill:#2C745A,stroke:#225B47,color:#F8FAFC,stroke-width:2px,font-weight:700
    classDef bk   fill:#B8742B,stroke:#8B5A21,color:#F8FAFC,stroke-width:2px,font-weight:700`
}

function parseCost(terraform = '') {
  let cost = 8
  if (terraform.includes('aws_instance')) cost += 15
  if (terraform.includes('aws_db_instance')) cost += 25
  if (terraform.includes('aws_elasticache')) cost += 18
  if (terraform.includes('aws_alb') || terraform.includes('aws_lb')) cost += 16
  if (terraform.includes('autoscaling')) cost += 10
  if (terraform.includes('cloudfront')) cost += 5
  return cost
}

function validateTerraform(terraform = '') {
  const items = []
  const ok   = (l, d) => items.push({ level: 'ok',   label: l, detail: d })
  const warn = (l, d) => items.push({ level: 'warn',  label: l, detail: d })
  terraform.includes('provider "aws"') ? ok('AWS provider configured', 'Targeting AWS Mumbai region.') : warn('Provider block missing', 'May need regeneration before running safely.');
  /storage_encrypted\s*=\s*true|encrypted\s*=\s*true/.test(terraform) ? ok('Encryption enabled', 'Data is encrypted at rest.') : warn('Encryption not set', 'Review DB resources before deploying.');
  /backup_retention_period\s*=\s*[1-9]/.test(terraform) ? ok('Backups configured', 'Automated backups are enabled.') : warn('Backups not set', 'Consider adding backup retention.');
  terraform.includes('security_group') ? ok('Firewall rules present', 'Network access is controlled.') : warn('Firewall rules missing', 'Review ingress settings.');
  if (terraform.includes('aws_vpc')) ok('Private network', 'Resources are inside a private VPC.')
  return items
}

function buildChecklist(terraform, labels) {
  const items = []
  if (terraform.includes('aws_instance'))    items.push(`1 × ${labels.app}`)
  if (terraform.includes('aws_db_instance')) items.push(`1 × ${labels.db}`)
  if (terraform.includes('aws_s3_bucket'))   items.push('1 × S3 file storage bucket')
  if (terraform.includes('cloudwatch'))      items.push(`1 × ${labels.monitor}`)
  if (terraform.includes('aws_alb') || terraform.includes('aws_lb')) items.push(`1 × ${labels.lb}`)
  if (items.length === 0) items.push('A lightweight starter infrastructure stack')
  return items
}

function buildHighlights(terraform, labels) {
  const h = []
  if (terraform.includes('security_group') || terraform.includes('aws_vpc')) h.push('Private networking and firewall rules keep the stack secure.')
  if (/storage_encrypted\s*=\s*true|encrypted\s*=\s*true/.test(terraform)) h.push(`${labels.db} is encrypted at rest.`)
  if (/backup_retention_period\s*=\s*[1-9]/.test(terraform)) h.push(`${labels.backup} are already planned in the setup.`)
  if (terraform.includes('cloudfront')) h.push(`${labels.cdn} keeps the experience fast for visitors.`)
  if (h.length === 0) h.push('Architecture is sized for a focused launch and easy to reason about.')
  return h.slice(0, 4)
}

function downloadText(filename, content) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type: 'text/plain' })),
    download: filename,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Mermaid diagram component ────────────────────────────────────────────────
function MermaidSurface({ code }) {
  const [svg, setSvg] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!mermaidReady) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#1F6B4F',
          primaryTextColor: '#F8FAFC',
          primaryBorderColor: '#17533D',
          lineColor: '#A2611B',
          secondaryColor: '#324B67',
          tertiaryColor: '#B8742B',
          fontFamily: 'DM Sans',
          fontSize: '14px',
        },
        flowchart: {
          htmlLabels: false,
        },
        securityLevel: 'loose',
      })
      mermaidReady = true
    }
  }, [])

  useEffect(() => {
    if (!code || !ref.current) return
    let cancelled = false
    ;(async () => {
      try {
        const id = `cx-${Date.now()}`
        const rendered = await mermaid.render(id, code)
        if (!cancelled) setSvg(rendered.svg)
      } catch { if (!cancelled) setSvg('') }
    })()
    return () => { cancelled = true }
  }, [code])

  if (!svg) return <div className="cx-diagram-loading" ref={ref}>Drafting architecture map…</div>
  return <div ref={ref} className="cx-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}

// ── Stage progress rail ──────────────────────────────────────────────────────
function StageRail({ stage }) {
  const active = STAGES.findIndex(s => s.id === stage)
  return (
    <div className="cx-stage-rail">
      {STAGES.map((s, i) => (
        <div key={s.id} className={cls('cx-stage-pill', i < active && 'is-done', i === active && 'is-active')}>
          <span className="cx-stage-index">
            {i < active ? <CheckCircle2 size={12} /> : i + 1}
          </span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Code panel ───────────────────────────────────────────────────────────────
function CodePanel({ design, activeTab, onTabChange, onExplain, explaining, explanation, onClearExplanation }) {
  const [copied, setCopied] = useState(false)
  const codeMap  = { terraform: design?.terraform || '', dockerfile: design?.dockerfile || '', pipeline: design?.pipeline || '', kubernetes: design?.kubernetes || '' }
  const fileMap  = { terraform: 'main.tf', dockerfile: 'Dockerfile', pipeline: 'pipeline.yml', kubernetes: 'k8s-manifests.yaml' }
  const currentCode = codeMap[activeTab] || '# Generating…'
  const lineCount = currentCode.split('\n').length

  function handleCopy() {
    navigator.clipboard.writeText(codeMap[activeTab] || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="cx-nerd-layout">
      <div className="cx-code-card">
        <div className="cx-code-tabs">
          {CODE_TABS.map(t => (
            <button key={t.id} className={cls('cx-code-tab', activeTab === t.id && 'is-active')} onClick={() => onTabChange(t.id)}>
              {t.label}
            </button>
          ))}
          <div className="cx-code-actions">
            <button className="cx-icon-button cx-small" onClick={handleCopy} title="Copy">
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            </button>
            <button className="cx-icon-button cx-small" onClick={() => downloadText(fileMap[activeTab], codeMap[activeTab])} title="Download">
              <Download size={14} />
            </button>
          </div>
        </div>
        <div className="cx-code-shell">
          <div className="cx-code-shell-head">
            <div className="cx-code-lights" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="cx-code-shell-meta">
              <span>{fileMap[activeTab]}</span>
              <span>{lineCount} lines</span>
            </div>
          </div>
          <pre className="cx-code-block">{currentCode}</pre>
        </div>
      </div>

      <div className="cx-explain-card">
        <div className="cx-card-header">
          <div>
            <p className="cx-eyebrow">Plain-English</p>
            <h3>Explain this code</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {explanation && <button className="cx-secondary-button cx-small" onClick={onClearExplanation}><RefreshCcw size={13} /></button>}
            <button className="cx-secondary-button" onClick={onExplain} disabled={explaining}>
              {explaining ? 'Thinking…' : explanation ? 'Re-explain' : 'Explain'}
            </button>
          </div>
        </div>
        <div className="cx-explanation">
          {explanation || 'Click Explain and the consultant will translate the current code tab into plain English you can share with anyone.'}
        </div>
      </div>
    </div>
  )
}

// ── Build history card ───────────────────────────────────────────────────────
function BuildCard({ build, selected, onClick }) {
  const tier = build.design?.architecture?.tier || 'Standard'
  const tierClass = tier.toLowerCase() === 'business' ? 'tier-business' : tier.toLowerCase() === 'starter' ? 'tier-starter' : 'tier-standard'
  return (
    <div className={cls('cx-build-card', selected && 'is-selected')} onClick={onClick}>
      <div className="cx-build-card-title">{build.domain} Setup</div>
      <div className="cx-build-card-meta">
        <span>₹{build.design?.costInr?.toLocaleString('en-IN') || '—'}/mo</span>
        <span>·</span>
        <span>{build.requirements?.traffic || 'standard'} traffic</span>
      </div>
      <div className={cls('cx-build-badge', tierClass)}>{tier} tier</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function ConsultantExperience() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [stage, setStage]                   = useState('welcome')
  const [health, setHealth]                 = useState('checking')
  const [welcomeInput, setWelcomeInput]     = useState('')
  const [chatInput, setChatInput]           = useState('')
  const [conversation, setConversation]     = useState([])
  const [requirements, setRequirements]     = useState(null)
  const [discovering, setDiscovering]       = useState(false)
  const [thinkingIdx, setThinkingIdx]       = useState(0)
  const [design, setDesign]                 = useState(null)
  const [generating, setGenerating]         = useState(false)
  const [businessView, setBusinessView]     = useState(true)
  const [activeTab, setActiveTab]           = useState('terraform')
  const [explaining, setExplaining]         = useState(false)
  const [explanationByTab, setExByTab]      = useState({})
  const [loadingSafety, setLoadingSafety]   = useState(false)
  const [safetyBrief, setSafetyBrief]       = useState('')
  const [deployState, setDeployState]       = useState({ steps: [], error: null })
  const [enableRealAws, setEnableRealAws]   = useState(false)
  const [sandbox, setSandbox]               = useState(null)
  const [controlMessages, setControlMsgs]   = useState([])
  const [controlInput, setControlInput]     = useState('')
  const [assistantBusy, setAssistantBusy]   = useState(false)
  const [destroying, setDestroying]         = useState(false)
  const [error, setError]                   = useState('')
  // Multi-build state
  const [builds, setBuilds]                 = useState([])
  const [activeBuildIdx, setActiveBuildIdx] = useState(null)

  const chatListRef    = useRef(null)
  const controlChatRef = useRef(null)

  // Auto-scroll chats
  useEffect(() => { if (chatListRef.current)    chatListRef.current.scrollTop    = chatListRef.current.scrollHeight    }, [conversation, discovering])
  useEffect(() => { if (controlChatRef.current) controlChatRef.current.scrollTop = controlChatRef.current.scrollHeight }, [controlMessages, assistantBusy])

  // Scroll to top on stage change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [stage])

  // Health check
  useEffect(() => {
    getJson('/api/health').then(() => setHealth('ok')).catch(() => setHealth('offline'))
  }, [])

  // Derived
  const domain = useMemo(
    () => inferDomain(welcomeInput + ' ' + conversation.map(c => c.content).join(' '), requirements?.bizType),
    [welcomeInput, conversation, requirements]
  )
  const labels     = useMemo(() => getFriendlyLabels(domain), [domain])
  const diagramCode = useMemo(() => buildDiagram(labels, requirements?.dataNeeds !== 'no'), [labels, requirements])
  const currentConfig = useMemo(() => design ? { tier: design.architecture?.tier, cost: design.costInr, summary: design.proposalSummary } : undefined, [design])

  // ── Discovery ───────────────────────────────────────────────────────────────
  async function continueDiscovery(history) {
    setDiscovering(true)
    setError('')
    try {
      const data = await postJson('/api/extract-requirements', {
        conversation: history.map(c => ({ role: c.role, content: c.content })),
      })
      const req = data.requirements
      setRequirements(req)

      let reply = ''
      if (req.missingInfo) {
        reply = await streamConsultantMessage({
          message: `You are a calm cloud consultant helping a non-technical business owner. Ask exactly ONE short follow-up question to clarify: ${req.missingInfo}. Context: ${req.summary}`,
        }).catch(() => req.missingInfo)
      } else {
        reply = await streamConsultantMessage({
          message: `Write a warm 2-sentence reply confirming you understand this business setup and are ready to design it: ${req.summary}`,
        }).catch(() => `Perfect. I have enough to design ${req.summary}.`)
      }

      setConversation([...history, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message || 'Could not reach the backend. Is the server running?')
    } finally {
      setDiscovering(false)
    }
  }

  async function handleWelcomeSubmit(e) {
    e.preventDefault()
    if (!welcomeInput.trim() || health !== 'ok') return
    const first = [{ role: 'user', content: welcomeInput.trim() }]
    setConversation(first)
    setStage('discovery')
    await continueDiscovery(first)
  }

  function handleWelcomeKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleWelcomeSubmit(e) }
  }

  async function handleDiscoverySubmit(e) {
    e.preventDefault()
    if (!chatInput.trim() || discovering) return
    const next = [...conversation, { role: 'user', content: chatInput.trim() }]
    setChatInput('')
    setConversation(next)
    await continueDiscovery(next)
  }

  function handleDiscoveryKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleDiscoverySubmit(e) }
  }

  // ── Generation ──────────────────────────────────────────────────────────────
  async function handleGenerateDesign() {
    if (!requirements) return
    setStage('thinking')
    setGenerating(true)
    setThinkingIdx(0)
    setError('')

    const description = welcomeInput.trim() || requirements.summary

    try {
      // Animate thinking steps
      for (let i = 0; i < THINKING_LINES.length; i++) {
        setThinkingIdx(i)
        await sleep(i === 0 ? 400 : 900)
      }

      // Terraform and Kubernetes depend on architecture, so generate that first.
      const archData = await postJson('/api/architecture', {
        bizType: requirements.bizType,
        traffic: requirements.traffic,
        dataNeeds: requirements.dataNeeds,
        description,
      })

      // Generate remaining artifacts in parallel once architecture is available.
      const [tfData, dfData, ciData, k8sData] = await Promise.all([
        postJson('/api/terraform',    { architecture: archData.architecture }),
        postJson('/api/dockerfile',   { bizType: requirements.bizType, description }),
        postJson('/api/cicd',         { bizType: requirements.bizType, description }),
        postJson('/api/kubernetes',   { bizType: requirements.bizType, architecture: archData.architecture }).catch(() => ({ manifests: '' })),
      ])

      const terraform = tfData.terraform || ''
      const costUsd   = parseCost(terraform)
      const costInr   = Math.round(costUsd * INR_RATE)

      // Generate a friendly proposal summary
      const proposalSummary = await streamConsultantMessage({
        message: `Write a 3-sentence non-technical summary of this cloud setup for a business owner. Architecture tier: ${archData.architecture?.tier}. Description: "${description}". Monthly cost: ₹${costInr.toLocaleString('en-IN')}. Keep it warm and reassuring.`,
      }).catch(() => `Your ${domain} setup includes a right-sized cloud foundation with ${archData.architecture?.tier} tier infrastructure, costing approximately ₹${costInr.toLocaleString('en-IN')}/month. It is designed to grow with you.`)

      const newDesign = {
        architecture:    archData.architecture,
        terraform,
        dockerfile:      dfData.dockerfile || '',
        pipeline:        ciData.pipeline   || '',
        kubernetes:      k8sData.manifests || '',
        costUsd,
        costInr,
        proposalSummary,
        checklist:       buildChecklist(terraform, labels),
        highlights:      buildHighlights(terraform, labels),
        checks:          validateTerraform(terraform),
      }

      setDesign(newDesign)

      // Save to multi-build history
      const buildEntry = {
        id:           Date.now(),
        domain,
        requirements: { ...requirements },
        design:       newDesign,
        welcomeInput,
        timestamp:    new Date().toLocaleTimeString(),
      }
      setBuilds(prev => {
        const updated = [...prev, buildEntry]
        setActiveBuildIdx(updated.length - 1)
        return updated
      })

      setStage('proposal')
    } catch (e) {
      setError(e.message || 'Generation failed. Check that the AI engine is running.')
      setStage('discovery')
    } finally {
      setGenerating(false)
    }
  }

  // ── Code explanation ─────────────────────────────────────────────────────────
  async function handleExplainCode() {
    if (!design) return
    setExplaining(true)
    const codeMap = { terraform: design.terraform, dockerfile: design.dockerfile, pipeline: design.pipeline, kubernetes: design.kubernetes }
    try {
      const explanation = await streamConsultantMessage({
        message: `Explain this ${activeTab} code to a non-technical business owner in 4–6 plain-English sentences. What does it do? Why does it matter? Code:\n\n${codeMap[activeTab]?.slice(0, 2000)}`,
        currentConfig,
      })
      setExByTab(prev => ({ ...prev, [activeTab]: explanation }))
    } catch (e) {
      setExByTab(prev => ({ ...prev, [activeTab]: 'Could not generate explanation right now.' }))
    } finally {
      setExplaining(false)
    }
  }

  function handleClearExplanation() { setExByTab(prev => ({ ...prev, [activeTab]: '' })) }

  // ── Safety brief ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'preview' || !design || safetyBrief) return
    setLoadingSafety(true)
    streamConsultantMessage({
      message: `Write a calm 3-sentence safety briefing for a business owner before deploying their cloud setup for the first time. Mention it is a local sandbox (not real AWS), is safe to destroy, and that no real money is spent. Context: ${design.proposalSummary}`,
      currentConfig,
    })
      .then(text => setSafetyBrief(text))
      .catch(() => setSafetyBrief('This is a local sandbox deployment — nothing real is provisioned and you can destroy it anytime with one click.'))
      .finally(() => setLoadingSafety(false))
  }, [stage, design])

  // ── Deploy ───────────────────────────────────────────────────────────────────
  async function handleDeploy() {
    if (!design) return
    setStage('deploy')
    setDeployState({ steps: [], error: null })

    const makeStep = (id, label) => ({ id, label, status: 'pending', detail: '' })
    const initial = [
      makeStep('ai',         'AI generation verified'),
      makeStep('docker',     'Building container'),
      makeStep('localstack', 'Provisioning local cloud'),
      makeStep('kubernetes', 'Applying Kubernetes manifests'),
      ...(enableRealAws ? [makeStep('aws', 'Applying Terraform to real AWS')] : []),
    ]
    setDeployState({ steps: initial, error: null })

    const update = (id, status, detail = '') =>
      setDeployState(prev => ({
        ...prev,
        steps: prev.steps.map(s => s.id === id ? { ...s, status, detail } : s),
      }))

    try {
      // Step 1 — verify AI artefacts
      update('ai', 'running', 'Verifying generated infrastructure code…')
      await sleep(800)
      if (!design.terraform?.trim()) throw new Error('Terraform configuration is empty — try regenerating.')
      update('ai', 'done', 'Infrastructure code verified.')

      // Step 2 — Docker
      update('docker', 'running', 'Building Docker container from Dockerfile…')
      let containerId = null
      let previewPort = null
      try {
        const dr = await postJson('/api/docker/deploy', { dockerfile: design.dockerfile, port: 8080 })
        containerId = dr.containerId
        previewPort = dr.port
        update('docker', 'done', `Container ready${containerId ? ` · ID ${containerId.slice(0, 10)}` : ''}`)
      } catch (e) {
        update('docker', 'warn', `Docker skipped: ${e.message}`)
      }

      // Step 3 — LocalStack
      update('localstack', 'running', 'Deploying Terraform to local cloud sandbox…')
      let lsRunId = null
      let lsWarning = null
      try {
        const lr = await postJson('/api/localstack/deploy', { terraform: design.terraform })
        lsRunId = lr.runId
        update('localstack', 'done', `Local cloud ready · run ${lsRunId}`)
      } catch (e) {
        lsWarning = e.message
        update('localstack', 'warn', `Local cloud skipped: ${e.message}`)
      }

      // Step 4 — Kubernetes
      if (design.kubernetes?.trim()) {
        update('kubernetes', 'running', 'Applying Kubernetes manifests…')
        try {
          await postJson('/api/kubernetes/apply', { manifests: design.kubernetes })
          update('kubernetes', 'done', 'Kubernetes resources created.')
        } catch (e) {
          update('kubernetes', 'warn', `Kubernetes skipped: ${e.message}`)
        }
      } else {
        update('kubernetes', 'skipped', 'No Kubernetes manifests for this setup.')
      }

      // Step 5 — Optional real AWS deploy
      let awsRun = null
      if (enableRealAws) {
        update('aws', 'running', 'Designing Terraform from chat context and deploying to AWS…')
        try {
          const res = await fetch(`${API_BASE}/api/aws/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              terraform: design.terraform || '',
              architecture: design.architecture || null,
              bizType: requirements?.bizType || 'store',
              traffic: requirements?.traffic || 'small',
              dataNeeds: requirements?.dataNeeds || 'yes',
              description: welcomeInput?.trim() || requirements?.summary || '',
            }),
          })

          if (!res.ok || !res.body) throw new Error(`AWS deploy request failed (${res.status})`)

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let finalStatus = null

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
            for (const line of lines) {
              try {
                const event = JSON.parse(line.slice(6))
                finalStatus = event
                if (event.status === 'running') update('aws', 'running', event.message || 'Deploying to AWS…')
                if (event.status === 'error') update('aws', 'warn', event.message || event.error || 'AWS deployment failed.')
                if (event.status === 'done') update('aws', 'done', event.message || 'AWS deployment complete.')
              } catch {}
            }
          }

          if (!finalStatus || finalStatus.status === 'error') {
            throw new Error(finalStatus?.message || finalStatus?.error || 'AWS deployment failed.')
          }

          awsRun = { message: finalStatus.message || 'AWS deployment complete.' }
        } catch (e) {
          update('aws', 'warn', `AWS skipped: ${e.message}`)
        }
      }

      const localHealthParams = new URLSearchParams({
        bizType: requirements?.bizType || 'custom',
        traffic: requirements?.traffic || 'small',
        dataNeeds: requirements?.dataNeeds || 'yes',
        description: welcomeInput?.trim() || requirements?.summary || '',
        runId: lsRunId || '',
      })
      const localHealthUrl = `/local-cloud-health?${localHealthParams.toString()}`

      setSandbox({
        containerId,
        previewUrl:        previewPort ? `http://localhost:${previewPort}` : null,
        localstackUrl:     localHealthUrl,
        localstackRunId:   lsRunId,
        localstackWarning: lsWarning,
        awsMessage:        awsRun?.message || null,
      })

      // Seed control chat
      setControlMsgs([{ role: 'assistant', content: `Your ${domain} cloud sandbox is ready. You can open the preview app, inspect the local cloud health, or ask me anything about your setup.` }])
      setStage('success')
    } catch (e) {
      setDeployState(prev => ({ ...prev, error: e.message }))
    }
  }

  // ── Destroy sandbox ──────────────────────────────────────────────────────────
  async function handleDestroySandbox() {
    setDestroying(true)
    try { await postJson('/api/destroy', {}) } catch {}
    setDestroying(false)
    setSandbox(null)
    setStage('welcome')
    // Reset for a new build
    setWelcomeInput('')
    setConversation([])
    setRequirements(null)
    setDesign(null)
    setSafetyBrief('')
    setExByTab({})
    setControlMsgs([])
  }

  // ── Start new build (without destroying) ────────────────────────────────────
  function handleNewBuild() {
    setWelcomeInput('')
    setConversation([])
    setRequirements(null)
    setDesign(null)
    setSafetyBrief('')
    setExByTab({})
    setControlMsgs([])
    setDeployState({ steps: [], error: null })
    setSandbox(null)
    setStage('welcome')
  }

  // ── Load a past build ────────────────────────────────────────────────────────
  function loadBuild(idx) {
    const b = builds[idx]
    if (!b) return
    setActiveBuildIdx(idx)
    setWelcomeInput(b.welcomeInput)
    setConversation([{ role: 'user', content: b.welcomeInput }])
    setRequirements(b.requirements)
    setDesign(b.design)
    setSafetyBrief('')
    setExByTab({})
    setStage('proposal')
  }

  // ── Control chat ─────────────────────────────────────────────────────────────
  async function handleControlSubmit(e) {
    e.preventDefault()
    if (!controlInput.trim() || assistantBusy) return
    const msg = controlInput.trim()
    setControlInput('')
    const nextMsgs = [...controlMessages, { role: 'user', content: msg }]
    setControlMsgs(nextMsgs)
    setAssistantBusy(true)
    try {
      const reply = await streamConsultantMessage({
        message: msg,
        history: nextMsgs,
        currentConfig,
      })
      setControlMsgs([...nextMsgs, { role: 'assistant', content: reply }])
    } catch {
      setControlMsgs([...nextMsgs, { role: 'assistant', content: 'Sorry, I could not respond right now.' }])
    } finally {
      setAssistantBusy(false)
    }
  }

  const defaultLocalHealthParams = new URLSearchParams({
    bizType: requirements?.bizType || 'custom',
    traffic: requirements?.traffic || 'small',
    dataNeeds: requirements?.dataNeeds || 'yes',
    description: welcomeInput?.trim() || requirements?.summary || '',
    runId: sandbox?.localstackRunId || '',
  })
  const defaultLocalHealthUrl = `/local-cloud-health?${defaultLocalHealthParams.toString()}`
  const localHealthActionUrl = sandbox?.localstackUrl?.includes('_localstack/health')
    ? defaultLocalHealthUrl
    : (sandbox?.localstackUrl || defaultLocalHealthUrl)

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="cx-shell">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="cx-header">
        <div>
          <div className="cx-brand">CloudCraft<span className="cx-brand-dot">.</span></div>
          <div className="cx-header-sub">Cloud Infrastructure Generator</div>
        </div>
        <div className="cx-header-actions">
          {builds.length > 0 && (
            <button className="cx-secondary-button cx-small" onClick={handleNewBuild} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Build
            </button>
          )}
          <span className={cls('cx-health', health === 'ok' && 'is-online', health === 'offline' && 'is-offline')}>
            {health === 'checking' ? 'Connecting…' : health === 'ok' ? 'AI Engine Online' : 'AI Engine Offline'}
          </span>
        </div>
      </header>

      {/* ── Stage Rail ───────────────────────────────────────────────────── */}
      <StageRail stage={stage} />

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && <div className="cx-banner error" style={{ maxWidth: 'min(1180px,100%)', margin: '0 auto 18px' }}>{error}</div>}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 1 — WELCOME
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'welcome' && (
        <section className="cx-stage">
          <div className="cx-hero">
            <div className="cx-hero-copy">
              <p className="cx-eyebrow">Cloud Infrastructure, Simplified</p>
              <h2>Tell us about your business<span className="cx-hero-accent">.</span><br />We handle the cloud<span className="cx-hero-accent">.</span></h2>
              <p>No DevOps degree needed. Describe your business in plain language and get a complete, deployable cloud setup — Terraform, Docker, CI/CD, and Kubernetes — generated for you.</p>
            </div>

            <form className="cx-welcome-form" onSubmit={handleWelcomeSubmit}>
              <p className="cx-eyebrow">Describe your business</p>

              {/* Quick presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    className="cx-secondary-button cx-small"
                    onClick={() => setWelcomeInput(p.prompt)}
                    style={{ fontSize: '0.76rem' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <textarea
                value={welcomeInput}
                onChange={e => setWelcomeInput(e.target.value)}
                onKeyDown={handleWelcomeKey}
                placeholder="e.g. I run a dental clinic and want a website where patients can book appointments online…"
                rows={4}
              />
              <div className="cx-form-footer">
                <span>Business language first. Cloud code comes after. <kbd>⌘ Enter</kbd> to submit.</span>
                <button
                  className="cx-primary-button"
                  disabled={!welcomeInput.trim() || health !== 'ok'}
                >
                  Begin Discovery
                  <ArrowRight size={16} />
                </button>
              </div>

              {health === 'offline' && (
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginTop: -8 }}>
                  ⚠ AI engine is offline. Start the backend server with <kbd>node server.js</kbd> in the backend folder.
                </p>
              )}
            </form>
          </div>

          {/* Past builds panel */}
          {builds.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="cx-builds-toolbar">
                <h3>Your Previous Builds</h3>
                <button className="cx-secondary-button cx-small" onClick={handleNewBuild} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={13} /> New Build
                </button>
              </div>
              <div className="cx-build-grid">
                {builds.map((b, i) => (
                  <BuildCard key={b.id} build={b} selected={activeBuildIdx === i} onClick={() => loadBuild(i)} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 2 — DISCOVERY
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'discovery' && (
        <section className="cx-stage cx-chat-stage">
          <div className="cx-stage-head">
            <p className="cx-eyebrow">Smart Discovery</p>
            <h2>The consultant is learning what matters.</h2>
            <p>Answer a few quick questions and the consultant will have everything needed to design your cloud setup.</p>
          </div>

          <div className="cx-chat-shell">
            <div className="cx-chat-list" ref={chatListRef}>
              {conversation.map((m, i) => (
                <div key={i} className={cls('cx-bubble', m.role === 'assistant' ? 'is-assistant' : 'is-user')}>
                  {m.role === 'assistant' && <div className="cx-bubble-icon"><Bot size={15} /></div>}
                  <div>{m.content}</div>
                </div>
              ))}
              {discovering && (
                <div className="cx-bubble is-assistant">
                  <div className="cx-bubble-icon"><Bot size={15} /></div>
                  <div className="cx-typing"><span /><span /><span /></div>
                </div>
              )}
            </div>

            <form className="cx-chat-form" onSubmit={handleDiscoverySubmit}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleDiscoveryKey}
                placeholder="Type your answer… (⌘ Enter to send)"
                rows={2}
              />
              <button className="cx-icon-button" disabled={!chatInput.trim() || discovering}>
                <Send size={16} />
              </button>
            </form>
          </div>

          <div className="cx-discovery-footer">
            <div className="cx-requirements-card">
              <p className="cx-eyebrow" style={{ marginBottom: 8 }}>What the consultant knows</p>
              <div className="cx-chip-row">
                <span className="cx-chip">{requirements?.bizType || 'business type …'}</span>
                <span className="cx-chip">{requirements?.traffic  || 'traffic …'}</span>
                <span className="cx-chip">{requirements?.dataNeeds || 'data needs …'}</span>
              </div>
              <p className="cx-small-copy">{requirements?.summary || 'Answer a couple of questions and your setup summary will appear here.'}</p>
            </div>

            <button
              className="cx-primary-button"
              onClick={handleGenerateDesign}
              disabled={!requirements || Boolean(requirements?.missingInfo) || generating}
            >
              Design My Setup
              <Sparkles size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 3 — THINKING / GENERATION
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'thinking' && (
        <section className="cx-stage cx-thinking-stage">
          <div className="cx-stage-head centered">
            <p className="cx-eyebrow">Generating your setup</p>
            <h2>Turning your conversation into infrastructure.</h2>
          </div>

          <div className="cx-thinking-card">
            {THINKING_LINES.map((line, i) => {
              const done   = i < thinkingIdx
              const active = i === thinkingIdx
              return (
                <div key={line} className={cls('cx-thinking-line', done && 'is-done', active && 'is-active')}>
                  <span className="cx-thinking-mark">
                    {done ? <CheckCircle2 size={15} /> : active ? <Activity size={15} /> : <Cloud size={15} />}
                  </span>
                  <span>{line}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 4 — PROPOSAL
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'proposal' && design && (
        <section className="cx-stage">
          <div className="cx-stage-head">
            <p className="cx-eyebrow">Your Proposal</p>
            <h2>Here is your custom cloud setup.</h2>
            <p>Switch between the business-friendly view and the technical code view.</p>
          </div>

          <div className="cx-view-toggle">
            <button className={cls('cx-toggle-button', businessView && 'is-active')} onClick={() => setBusinessView(true)}>Business View</button>
            <button className={cls('cx-toggle-button', !businessView && 'is-active')} onClick={() => setBusinessView(false)}>Technical View</button>
          </div>

          {businessView ? (
            <div className="cx-proposal-grid">
              <div className="cx-surface-card cx-diagram-card">
                <div className="cx-card-header">
                  <div>
                    <p className="cx-eyebrow">Architecture map</p>
                    <h3>{domain} flow</h3>
                  </div>
                  <span className="cx-inline-badge">{design.architecture?.tier || 'Standard'} tier</span>
                </div>
                <MermaidSurface code={diagramCode} />
              </div>

              <div className="cx-surface-card">
                <div className="cx-card-header">
                  <div>
                    <p className="cx-eyebrow">Plain-English summary</p>
                    <h3>What you are getting</h3>
                  </div>
                  <span className="cx-price">₹{design.costInr.toLocaleString('en-IN')}/mo</span>
                </div>
                <p className="cx-summary-copy">{design.proposalSummary}</p>
                <div className="cx-chip-grid">
                  <span className="cx-chip">{labels.app}</span>
                  {requirements?.dataNeeds !== 'no' && <span className="cx-chip">{labels.db}</span>}
                  <span className="cx-chip">{labels.lb}</span>
                  <span className="cx-chip">{labels.monitor}</span>
                </div>
                <div className="cx-highlight-list" style={{ marginTop: 16 }}>
                  {design.highlights.map(h => (
                    <div key={h} className="cx-highlight-item">
                      <ShieldCheck size={15} />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <CodePanel
              design={design}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onExplain={handleExplainCode}
              onClearExplanation={handleClearExplanation}
              explaining={explaining}
              explanation={explanationByTab[activeTab]}
            />
          )}

          <div className="cx-action-row">
            <button className="cx-secondary-button" onClick={() => setStage('discovery')}>Back to discovery</button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="cx-secondary-button" onClick={handleNewBuild}>
                <Plus size={15} /> New build
              </button>
              <button className="cx-primary-button" onClick={() => setStage('preview')}>
                Looks good — let's build it <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 5 — SAFETY CHECK / PREVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'preview' && design && (
        <section className="cx-stage">
          <div className="cx-stage-head">
            <p className="cx-eyebrow">Safety Check</p>
            <h2>Before anything goes live — read this first.</h2>
            <p>The first deployment runs in a local sandbox. Nothing real is provisioned and you can destroy it at any time.</p>
          </div>

          <div className="cx-preview-grid">
            <div className="cx-surface-card">
              <div className="cx-card-header">
                <div>
                  <p className="cx-eyebrow">What will be created</p>
                  <h3>Deployment checklist</h3>
                </div>
                <span className="cx-inline-badge">2–3 min estimate</span>
              </div>
              <div className="cx-checklist">
                {design.checklist.map(item => (
                  <div key={item} className="cx-checklist-item">
                    <CheckCircle2 size={15} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="cx-safe-badge">
                <RefreshCcw size={14} />
                You can destroy this sandbox anytime with one click.
              </div>
              <div className="cx-muted-card" style={{ marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableRealAws}
                    onChange={e => setEnableRealAws(e.target.checked)}
                  />
                  <span>
                    Also run real AWS Terraform (`init` / `validate` / `plan` / `apply`) after local sandbox.
                  </span>
                </label>
              </div>
            </div>

            <div className="cx-surface-card">
              <div className="cx-card-header">
                <div>
                  <p className="cx-eyebrow">Safety briefing</p>
                  <h3>What to know</h3>
                </div>
                <Lock size={17} />
              </div>
              <p className="cx-summary-copy">
                {loadingSafety ? 'Writing your safety briefing…' : safetyBrief}
              </p>
              <div className="cx-checks-grid">
                {design.checks.map(item => (
                  <div key={`${item.level}-${item.label}`} className={cls('cx-check-card', item.level === 'warn' && 'is-warn')}>
                    {item.level === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cx-action-row">
            <button className="cx-secondary-button" onClick={() => setStage('proposal')}>Back to proposal</button>
            <button className="cx-primary-button" onClick={handleDeploy}>
              Deploy to local sandbox <Play size={15} />
            </button>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 6 — DEPLOY
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'deploy' && (
        <section className="cx-stage cx-deploy-stage">
          <div className="cx-stage-head centered">
            <p className="cx-eyebrow">Building your sandbox</p>
            <h2>Assembling your cloud environment.</h2>
          </div>

          <div className="cx-deploy-card">
            {deployState.steps.map(step => (
              <div key={step.id} className={cls('cx-deploy-line', `is-${step.status}`)}>
                <span className="cx-deploy-icon">
                  {step.status === 'done'    ? <CheckCircle2 size={17} /> :
                   step.status === 'warn'    ? <AlertTriangle size={17} /> :
                   step.status === 'skipped' ? <Cloud size={17} /> :
                   step.status === 'running' ? <Activity size={17} /> :
                   <HardDrive size={17} />}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail || (step.status === 'running' ? 'Working on it…' : step.status === 'pending' ? 'Waiting in the queue…' : '')}</p>
                </div>
              </div>
            ))}
            {deployState.error && <div className="cx-banner error">{deployState.error}</div>}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STAGE 7 — SUCCESS / CONTROL CENTER
      ══════════════════════════════════════════════════════════════════ */}
      {stage === 'success' && design && (
        <section className="cx-stage">
          <div className="cx-stage-head">
            <p className="cx-eyebrow">Control Center</p>
            <h2>Your cloud sandbox is ready.</h2>
            <p>Inspect it, open the preview, ask the consultant anything, or tear it down safely.</p>
          </div>

          <div className="cx-success-grid">
            <div className="cx-surface-card">
              <div className="cx-card-header">
                <div>
                  <p className="cx-eyebrow">Primary actions</p>
                  <h3>Inspect or clean up</h3>
                </div>
                <span className="cx-inline-badge is-good">Sandbox Ready</span>
              </div>

              <div className="cx-action-stack">
                {sandbox?.localstackWarning && <div className="cx-muted-card">{sandbox.localstackWarning}</div>}

                {sandbox?.previewUrl ? (
                  <a className="cx-primary-button is-link" href={sandbox.previewUrl} target="_blank" rel="noreferrer">
                    Open Preview App <ExternalLink size={15} />
                  </a>
                ) : (
                  <div className="cx-muted-card">
                    Preview app was not started. The infrastructure sandbox is still available.
                  </div>
                )}

                <a className="cx-secondary-button is-link" href={localHealthActionUrl} target="_blank" rel="noreferrer">
                  Open Local Cloud Health <ExternalLink size={15} />
                </a>

                <a
                  className="cx-secondary-button is-link"
                  href="https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#Instances:instanceState=running"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open AWS Running EC2 <ExternalLink size={15} />
                </a>

                <button className="cx-secondary-button" onClick={handleNewBuild} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={15} /> Start a new build
                </button>

                <button className="cx-danger-button" onClick={handleDestroySandbox} disabled={destroying}>
                  <Trash2 size={15} />
                  {destroying ? 'Destroying…' : 'Destroy sandbox'}
                </button>
              </div>

              <div className="cx-status-grid">
                <div className="cx-status-card">
                  <Server size={15} />
                  <div>
                    <strong>Preview app</strong>
                    <p>{sandbox?.previewUrl ? 'Reachable locally' : sandbox?.previewError || 'Not launched'}</p>
                  </div>
                </div>
                <div className="cx-status-card">
                  <Cloud size={15} />
                  <div>
                    <strong>Local cloud</strong>
                    <p>{sandbox?.localstackRunId ? `Run ${sandbox.localstackRunId}` : 'Ready'}</p>
                  </div>
                </div>
                <div className="cx-status-card">
                  <Database size={15} />
                  <div>
                    <strong>Data layer</strong>
                    <p>{requirements?.dataNeeds === 'no' ? 'Optional in this setup' : labels.db}</p>
                  </div>
                </div>
                {sandbox?.awsMessage && (
                  <div className="cx-status-card">
                    <Zap size={15} />
                    <div>
                      <strong>Real AWS</strong>
                      <p>{sandbox.awsMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="cx-surface-card">
              <div className="cx-card-header">
                <div>
                  <p className="cx-eyebrow">Ask the consultant</p>
                  <h3>What should we do next?</h3>
                </div>
                <Bot size={17} />
              </div>

              <div className="cx-control-chat" ref={controlChatRef}>
                {controlMessages.map((m, i) => (
                  <div key={i} className={cls('cx-mini-bubble', m.role === 'assistant' ? 'is-assistant' : 'is-user')}>
                    {m.content}
                  </div>
                ))}
                {assistantBusy && <div className="cx-mini-bubble is-assistant">Thinking…</div>}
              </div>

              <form className="cx-control-form" onSubmit={handleControlSubmit}>
                <input
                  value={controlInput}
                  onChange={e => setControlInput(e.target.value)}
                  placeholder="Ask about backups, costs, scaling, or next steps…"
                />
                <button className="cx-icon-button" disabled={!controlInput.trim() || assistantBusy}>
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>

          {/* Past builds section */}
          {builds.length > 1 && (
            <div style={{ marginTop: 32 }}>
              <div className="cx-builds-toolbar">
                <h3>All your builds ({builds.length})</h3>
              </div>
              <div className="cx-build-grid">
                {builds.map((b, i) => (
                  <BuildCard key={b.id} build={b} selected={activeBuildIdx === i} onClick={() => loadBuild(i)} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
