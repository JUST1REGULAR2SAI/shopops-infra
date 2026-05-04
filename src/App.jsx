import { useState, useEffect, useRef } from 'react'
import ChatOnboarding from './ChatOnboarding'
import ConsultantExperience from './ConsultantExperience'
import LocalCloudHealth from './LocalCloudHealth'
import { Globe, Cloud, Activity, Lock, ShoppingBag, Building2, Smartphone, Calendar, Settings, Server, Database, HardDrive, Monitor, User, Zap, ShieldCheck, RefreshCcw, MessageCircle, Play, Pause, Trash2, BarChart3, ArrowRight, CheckCircle2, AlertTriangle, FileText, HelpCircle } from 'lucide-react'
import mermaid from 'mermaid'
// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  themeVariables: {
    primaryColor: '#21405E',
    primaryTextColor: '#fff',
    primaryBorderColor: '#21405E',
    lineColor: '#F0C060'
  },
  securityLevel: 'loose'
})

// Mermaid Diagram Component
function MermaidDiagram({ code }) {
  const ref = useRef(null)
  const [svg, setSvg] = useState(null)
  
  useEffect(() => {
    if (!code || !ref.current) return
    (async () => {
      try {
        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, code)
        setSvg(svg)
      } catch (e) {
        console.error('Mermaid render failed', e)
      }
    })()
  }, [code])

  return (
    <div ref={ref}>
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div style={{ padding: '30px', color: '#888', fontSize: 12, textAlign: 'center' }}>
          Loading diagram...
        </div>
      )}
    </div>
  )
}

// ─── BRAND TOKENS ─────────────────────────────────────────────────────────
const CL = {                               // ← LIGHT palette
  bg:      '#F2F2F2',
  surface: '#FFFFFF',
  hover:   'rgba(33,64,94,.06)',
  navy:    '#21405E',
  navyDk:  '#1A3551',
  gold:    '#D9A648',
  goldDk:  '#C08A30',
  neutral: '#4A4A4A',
  text:    '#21405E',
  muted:   'rgba(74,74,74,.75)',
  border:  'rgba(33,64,94,.12)',
  borderMd:'rgba(33,64,94,.25)',
  green:   '#2D8B5A',
  red:     '#C0392B',
}
const CD = {                               // ← DARK palette
  bg:      '#0D1B2A',
  surface: '#152232',
  hover:   'rgba(107,179,210,.08)',
  navy:    '#7BB8E0',
  navyDk:  '#5A9EC8',
  gold:    '#F0C060',
  goldDk:  '#D4A040',
  neutral: '#A0B0C0',
  text:    '#C8DCF0',
  muted:   'rgba(160,195,225,.65)',
  border:  'rgba(80,140,200,.18)',
  borderMd:'rgba(80,140,200,.32)',
  green:   '#4CAF82',
  red:     '#E05A4A',
}
// Mutable — swapped on dark mode toggle; all components re-render and pick up new values
let C = { ...CL }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── ATOMS ────────────────────────────────────────────────────────────────
const Syne = ({ c, s = {}, ...p }) =>
  <span style={{ fontFamily: "'Syne',sans-serif", color: c, ...s }} {...p} />
const Mono = ({ c, s = {}, ...p }) =>
  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: c, ...s }} {...p} />

const Pill = ({ children, color = C.navy }) => (
  <span className="pill"
    style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
    {children}
  </span>
)
const Prog = ({ pct }) => (
  <div className="prog-track">
    <div className="prog-fill" style={{ width: `${pct}%` }} />
  </div>
)
const Spin = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="spin">
    <circle cx="12" cy="12" r="10" fill="none" stroke={C.gold}
      strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
  </svg>
)
const Check = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill={`${C.green}22`} stroke={C.green} strokeWidth="1.5" />
    <path d="M7 12l3.5 3.5L17 8" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── TYPEWRITER ───────────────────────────────────────────────────────────
function TypeWriter({ text = '', speed = 14 }) {
  const [out, setOut] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setOut(''); setDone(false)
    let i = 0
    const id = setInterval(() => {
      i++; setOut(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text])
  return <>{out}{!done && <span className="tw-cursor">|</span>}</>
}

// ─── AWS TOOLTIPS ──────────────────────────────────────────────────────────
const AWS_TIPS = {
  'aws_instance':      'Your app server — the computer in the cloud that runs your website 24/7',
  'aws_db_instance':   'Your database — stores all customer orders and accounts securely',
  'aws_vpc':           'Your private network — a fenced plot in the cloud only your app can access',
  'security_group':    'Your firewall — controls exactly who can talk to your server',
  'aws_alb':           'Your traffic manager — spreads visitors across servers so none gets overwhelmed',
  'aws_cloudfront':    'Speed layer — serves your site from servers near your customers',
  'aws_s3_bucket':     'File storage — stores images, documents and backups cheaply',
  'aws_elasticache':   'Speed cache — remembers frequent answers so pages load faster',
  'autoscaling':       'Elastic capacity — automatically adds servers when traffic spikes',
  'storage_encrypted': 'Encryption — data is scrambled so only your app can read it',
  'backup_retention':  'Auto-backups — daily snapshots you can restore from any time',
  'cloudwatch':        'Monitoring — alerts you the moment anything behaves unexpectedly',
}
const Tip = ({ term, children }) => {
  const hint = Object.entries(AWS_TIPS).find(([k]) => term?.includes(k))?.[1]
  if (!hint) return <>{children}</>
  return (
    <span className="tip-wrap">
      {children}
      <span className="tip-icon">i</span>
      <span className="tip-box">{hint}</span>
    </span>
  )
}
const HealthDot = ({ status }) => {
  const cfg = {
    ok:      { cls:'hdot hdot-green', label:'AI ready' },
    slow:    { cls:'hdot hdot-amber', label:'AI warming up — first run may take 20s' },
    offline: { cls:'hdot hdot-red',   label:'AI offline — run: ai-engine start' },
    checking:{ cls:'',                label:'Checking AI…' },
  }[status] || { cls:'', label:'…' }
  return (
    <div className="health-row">
      {status === 'checking' ? <Spin size={10} /> : <span className={cfg.cls} />}
      <span>{cfg.label}</span>
    </div>
  )
}
function parseSecurityChecks(terraform='') {
  return [
    { label:'Database encrypted at rest',  pass: /storage_encrypted.*true|encrypted.*true/.test(terraform) },
    { label:'Private network (VPC)',        pass: terraform.includes('aws_vpc') },
    { label:'Firewall rules defined',       pass: terraform.includes('security_group') },
    { label:'Automated backups enabled',   pass: /backup_retention_period\s*=\s*[1-9]/.test(terraform) },
    { label:'Mumbai region (low latency)', pass: terraform.includes('ap-south-1') },
    { label:'Monitoring configured',       pass: terraform.includes('cloudwatch') || terraform.includes('monitoring') },
  ]
}

// ─── UTILS ────────────────────────────────────────────────────────────────
const StepHeader = ({ step, total, onBack }) => {
  const pct = Math.round(((step - 1) / (total - 1)) * 100)
  return (
    <div className="stepper">
      <button className="btn-g btn-back" onClick={onBack} disabled={!onBack}>
        ← Back
      </button>
      <div className="stepper-track">
        <div className="stepper-fill" style={{ width: `${pct}%` }} />
        {Array.from({ length: total }).map((_, i) => {
          const left = (i / (total - 1)) * 100
          const on = i < step
          return <span key={i} className={`step-dot ${on ? 'on' : ''}`} style={{ left: `${left}%` }} />
        })}
      </div>
      <div className="stepper-label">
        <span className="mono">Step {step}</span>
        <span className="muted"> / {total}</span>
      </div>
    </div>
  )
}

const MiniChart = () => {
  const points = [6, 12, 8, 16, 10, 18, 14, 21, 16, 26, 18, 28, 20, 32]
  const max = Math.max(...points)
  const min = Math.min(...points)
  const h = 120
  const w = 520
  const step = w / (points.length - 1)
  const d = points.map((p, i) => {
    const x = i * step
    const y = h - ((p - min) / (max - min)) * (h - 10) - 5
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
  return (
    <svg width="100%" height="140" viewBox={`0 0 ${w} ${h}`} className="mini-chart">
      <defs>
        <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.navy} />
          <stop offset="100%" stopColor={C.gold} />
        </linearGradient>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`${C.gold}55`} />
          <stop offset="100%" stopColor={`${C.gold}00`} />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#chartFill)" opacity="0.8" />
      <path d={d} fill="none" stroke="url(#chartStroke)" strokeWidth="3" strokeLinecap="round" />
      {points.map((p, i) => {
        const x = i * step
        const y = h - ((p - min) / (max - min)) * (h - 10) - 5
        return <circle key={i} cx={x} cy={y} r="3.2" fill={C.surface} stroke={C.navy} strokeWidth="1.5" />
      })}
    </svg>
  )
}

// ─── SCREEN 1: WELCOME & CHAT ONBOARDING ────────────────────────────────
function Welcome({ onStart, onDemo, onChatComplete }) {
  const [showChat, setShowChat] = useState(false);
  const icons = [
    { icon: Globe, label: 'Website',  color: C.navy },
    { icon: Cloud, label: 'Cloud',    color: C.gold },
    { icon: Activity, label: 'Monitor',  color: C.neutral },
    { icon: Lock, label: 'Secure',   color: C.green },
  ]
  return (
    <div className="fu hero" style={{ maxWidth: 780, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }}>
        <Pill color={C.gold}>✦ Cloud setup for real businesses</Pill>
      </div>
      <Syne s={{ fontSize: 'clamp(2rem,6vw,3.5rem)', fontWeight: 800, lineHeight: 1.1,
        color: C.navy, display: 'block', marginBottom: 20 }}>
        Describe your business.<br />
        <span style={{ color: C.gold }}>We handle the cloud.</span>
      </Syne>
      <p style={{ fontSize: 17, color: C.muted, marginBottom: 44, maxWidth: 500, margin: '0 auto 44px', lineHeight: 1.7 }}>
        Tell us what your business does. We'll set up everything you need to run reliably in the cloud — no DevOps degree required.
      </p>

      {!showChat ? (
        <>
          <div className="hero-cta" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
            <button className="btn-p magnetic" onClick={() => setShowChat(true)} style={{ fontSize: 16, padding: '15px 40px' }}>
              ✨ Auto-Setup with AI
            </button>
            <button className="btn-acc" onClick={onStart} style={{ padding: '15px 28px', fontSize: 14 }}>
              ⚙️ Manual Setup
            </button>
            <button className="btn-g" onClick={onDemo} style={{ padding: '15px 28px', fontSize: 14 }}>
              👁 See Demo
            </button>
          </div>
          <div className="hero-metrics" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            {icons.map(ic => {
              const Icon = ic.icon;
              return (
                <div key={ic.label} className="card card-hov glass" style={{
                  padding: '20px 26px', minWidth: 110,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                }}>
                  <Icon size={28} color={ic.color} strokeWidth={1.5} />
                  <span style={{ fontSize: 12, color: ic.color, fontWeight: 700 }}>{ic.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '18px 24px', background: `${C.gold}12`,
            border: `1.5px solid ${C.gold}33`, borderRadius: 14, maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontSize: 13, color: C.muted }}>
              🔒 <strong style={{ color: C.navy }}>No credit card required</strong> to explore.
              You control billing at every step.
            </p>
          </div>
        </>
      ) : (
        <div className="fi">
          <div style={{ marginBottom: '24px' }}>
            <button className="btn-g" onClick={() => setShowChat(false)} style={{ fontSize: 13 }}>
              ← Back to options
            </button>
          </div>
          <ChatOnboarding onComplete={onChatComplete} />
        </div>
      )}
    </div>
  )
}

// ─── SCREEN 2: BUSINESS TYPE ──────────────────────────────────────────────
const BIZ_TYPES = [
  { id: 'store',   icon: ShoppingBag, label: 'Online Store',         desc: 'Sell products online',           infra: 'Web → Cart → DB → Payments' },
  { id: 'website', icon: Building2, label: 'Company Website',       desc: 'Marketing or info site',         infra: 'CDN → Web Server → CMS' },
  { id: 'app',     icon: Smartphone, label: 'Mobile App Backend',    desc: 'Power your mobile app',          infra: 'API → Auth → Database → Cache' },
  { id: 'booking', icon: Calendar, label: 'Booking System',        desc: 'Appointments & reservations',    infra: 'Web → Scheduler → DB → Email' },
  { id: 'custom',  icon: Settings, label: 'Custom Application',    desc: 'Something unique to you',        infra: 'Custom → Scalable → Secure' },
]

function BusinessType({ value, onChange, onNext, onBack }) {
  return (
    <div className="fu" style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      <StepHeader step={1} total={5} onBack={onBack} />
      <Syne s={{ fontSize: 26, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 8 }}>
        What kind of business do you run?
      </Syne>
      <p style={{ color: C.muted, marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>
        We'll choose the best technology for your needs automatically.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {BIZ_TYPES.map(b => {
          const Icon = b.icon;
          return (
            <div key={b.id} className={`radio ${value === b.id ? 'on' : ''}`}
              onClick={() => onChange(b.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Icon size={26} color={C.navy} strokeWidth={1.5} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: C.navy, fontSize: 15 }}>{b.label}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{b.desc}</div>
              </div>
              {value === b.id && (
                <Mono s={{ fontSize: 10, color: C.gold }}>{b.infra}</Mono>
              )}
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${value === b.id ? C.navy : C.borderMd}`,
                background: value === b.id ? C.navy : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {value === b.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FAF7F2' }} />}
              </div>
            </div>
          );
        })}
      </div>
      {value && (
        <div className="fi" style={{ marginTop: 16, padding: '14px 16px',
          background: `${C.navy}09`, border: `1.5px solid ${C.navy}22`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: C.muted }}>
            💡 We automatically choose the best technology for <strong style={{ color: C.navy }}>
              {BIZ_TYPES.find(b => b.id === value)?.label}</strong>. No configuration needed.
          </p>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <button className="btn-p" disabled={!value} onClick={onNext} style={{ width: '100%', padding: '14px' }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── SCREEN 3: TRAFFIC ────────────────────────────────────────────────────
const TRAFFIC_OPTS = [
  { id: 'tiny',   label: 'Less than 1,000', sub: 'Just starting out',    tier: 'Starter',  cost: 12 },
  { id: 'small',  label: '1,000 – 10,000',  sub: 'Growing business',     tier: 'Standard', cost: 28 },
  { id: 'medium', label: '10,000 – 100,000',sub: 'Established presence', tier: 'Business', cost: 65 },
  { id: 'unsure', label: 'Not Sure Yet',    sub: "We'll start you small", tier: 'Starter',  cost: 12 },
]
const TIER_COLORS = { Starter: C.green, Standard: C.navy, Business: C.gold }

function Traffic({ value, onChange, onNext, onBack }) {
  const selected = TRAFFIC_OPTS.find(t => t.id === value)
  return (
    <div className="fu" style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <StepHeader step={2} total={5} onBack={onBack} />
      <Syne s={{ fontSize: 26, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 8 }}>
        How many visitors do you expect?
      </Syne>
      <p style={{ color: C.muted, marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>
        We'll size your setup so you only pay for what you need.
      </p>
      <div className="traffic-grid">
        {TRAFFIC_OPTS.map(t => (
          <div key={t.id} className={`radio ${value === t.id ? 'on' : ''}`}
            onClick={() => onChange(t.id)}
            style={{ textAlign: 'center', padding: '22px 14px' }}>
            <div style={{ fontWeight: 700, color: C.navy, fontSize: 15, marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{t.sub}</div>
            <Pill color={TIER_COLORS[t.tier] || C.navy}>{t.tier}</Pill>
            <div style={{ marginTop: 8, fontWeight: 700, color: C.gold, fontSize: 13 }}>~${t.cost}/mo</div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fi" style={{ marginTop: 16, padding: '14px 16px',
          background: `${C.gold}10`, border: `1.5px solid ${C.gold}33`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: C.muted }}>
            📈 {value === 'medium'
              ? 'Auto-scaling will be added to handle traffic spikes automatically.'
              : `We'll set up a ${selected.tier} plan — perfectly sized for your needs.`}
          </p>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <button className="btn-p" disabled={!value} onClick={onNext} style={{ width: '100%', padding: '14px' }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── SCREEN 4: DATA NEEDS ─────────────────────────────────────────────────
function DataNeeds({ value, onChange, onNext, onBack }) {
  const opts = [
    { id: 'yes',    icon: Database, label: 'Yes',       sub: 'Store customers, orders, bookings', color: C.navy },
    { id: 'no',     icon: FileText, label: 'No',        sub: 'Static content only',               color: C.neutral },
    { id: 'unsure', icon: HelpCircle, label: 'Not Sure',  sub: "We'll add it just in case",         color: C.gold },
  ]
  return (
    <div className="fu" style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
      <StepHeader step={3} total={5} onBack={onBack} />
      <Syne s={{ fontSize: 26, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 8 }}>
        Do you need to store customer data?
      </Syne>
      <p style={{ color: C.muted, marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>
        This helps us decide if you need a database for orders, customers, or appointments.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map(o => {
          const Icon = o.icon;
          return (
            <div key={o.id} className={`radio ${value === o.id ? 'on' : ''}`}
              onClick={() => onChange(o.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 16px' }}>
              <Icon size={28} color={o.color} strokeWidth={1.5} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: C.navy }}>{o.label}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{o.sub}</div>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${value === o.id ? o.color : C.borderMd}`,
                background: value === o.id ? o.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {value === o.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FAF7F2' }} />}
              </div>
            </div>
          );
        })}
      </div>
      {value === 'yes' && (
        <div className="fi" style={{ marginTop: 14, padding: '14px 16px',
          background: `${C.green}0f`, border: `1.5px solid ${C.green}33`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: C.muted }}>
            🔐 We'll set up a <strong style={{ color: C.navy }}>secure, AES-256 encrypted database</strong> for your business data.
          </p>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <button className="btn-p" disabled={!value} onClick={onNext} style={{ width: '100%', padding: '14px' }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── SCREEN 5: COST PREVIEW ───────────────────────────────────────────────
function CostPreview({ traffic, dataNeeds, onNext, onBack }) {
  const trafficData = TRAFFIC_OPTS.find(t => t.id === traffic) || TRAFFIC_OPTS[0]
  const dbCost = dataNeeds === 'yes' ? 15 : 0
  const backupCost = dataNeeds === 'yes' ? 3 : 0
  const serverCost = trafficData.cost
  const total = serverCost + dbCost + backupCost + 5
  const lineItems = [
    { label: 'Application hosting',  cost: serverCost, icon: Server, color: C.navy },
    ...(dbCost     > 0 ? [{ label: 'Database storage',   cost: dbCost,     icon: Database, color: C.gold }]  : []),
    ...(backupCost > 0 ? [{ label: 'Automatic backups',  cost: backupCost, icon: HardDrive, color: C.neutral }]: []),
    { label: 'Security & monitoring',cost: 5,           icon: ShieldCheck, color: C.green },
  ]
  return (
    <div className="fu" style={{ maxWidth: 540, margin: '0 auto', padding: '48px 24px' }}>
      <StepHeader step={4} total={5} onBack={onBack} />
      <Syne s={{ fontSize: 26, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 8 }}>
        Your estimated monthly cost
      </Syne>
      <p style={{ color: C.muted, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
        Based on your answers — transparent pricing, no surprises.
      </p>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        {lineItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: i < lineItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={18} color={item.color} strokeWidth={1.5} />
                <span style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              </div>
              <Mono s={{ color: item.color, fontSize: 14, fontWeight: 700 }}>${item.cost}/mo</Mono>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, paddingTop: 16, borderTop: `2px solid ${C.border}` }}>
          <Syne s={{ fontSize: 16, fontWeight: 700, color: C.navy }}>Estimated Total</Syne>
          <Syne s={{ fontSize: 26, fontWeight: 800, color: C.gold }}>${total}<span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>/mo</span></Syne>
        </div>
      </div>
      <div style={{ padding: '14px 16px', background: `${C.gold}12`,
        border: `1.5px solid ${C.gold}33`, borderRadius: 12, marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.muted }}>
          💡 <strong style={{ color: C.navy }}>Pause or cancel anytime</strong> — your card is never charged without confirmation.
        </p>
      </div>
      <button className="btn-acc" onClick={onNext} style={{ width: '100%', padding: '15px', fontSize: 16 }}>
        🚀 Preview My Cloud Setup
      </button>
    </div>
  )
}

// ─── SCREEN 6: INFRA DIAGRAM ──────────────────────────────────────────────
const NODES = [
  { id:'user',   x:60,  y:160, icon:User, label:'Your Customers',  color:C.navy,    info:'Every visitor who comes to your website or app starts here.' },
  { id:'cdn',    x:220, y:80,  icon:Globe, label:'Global Network',  color:C.gold,    info:'Content delivered from servers close to your customers worldwide — making your site fast everywhere.' },
  { id:'lb',     x:220, y:240, icon:BarChart3, label:'Traffic Manager', color:C.neutral, info:'Spreads the load across servers during busy periods so your site never slows down.' },
  { id:'app',    x:400, y:160, icon:Server, label:'Your Application',color:C.green,   info:'This is where your website or app actually runs. It handles every customer request 24/7.' },
  { id:'db',     x:560, y:100, icon:Database, label:'Database',        color:C.navy,    info:'Stores all your business data — customers, orders, bookings — safely and securely.' },
  { id:'backup', x:560, y:240, icon:HardDrive, label:'Auto Backups',    color:C.gold,    info:'Your data is automatically backed up every day so you never lose anything.' },
]
const EDGES = [['user','cdn'],['user','lb'],['cdn','app'],['lb','app'],['app','db'],['app','backup']]

function InfraDiagram({ dataNeeds, onNext, onBack }) {
  const [hovered, setHovered] = useState(null)
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [])
  const activeNodes = dataNeeds === 'no' ? NODES.filter(n => !['db','backup'].includes(n.id)) : NODES
  const activeEdges = dataNeeds === 'no'
    ? EDGES.filter(([a,b]) => !['db','backup'].includes(a) && !['db','backup'].includes(b)) : EDGES
  const hovNode = NODES.find(n => n.id === hovered)
  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]))
  return (
    <div className="fu" style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
      <StepHeader step={5} total={5} onBack={onBack} />
      <Syne s={{ fontSize: 26, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 8 }}>
        Your cloud setup preview
      </Syne>
      <p style={{ color: C.muted, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
        Click any component to learn what it does. This is exactly what we'll build for you.
      </p>
      <div className="card" style={{ padding: 16, marginBottom: 14, overflowX: 'auto' }}>
        <svg width="640" height="340" viewBox="0 0 640 340" style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={C.borderMd} />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Animated edges — draw themselves via stroke-dashoffset */}
          {activeEdges.map(([a,b], ei) => {
            const na=nodeMap[a], nb=nodeMap[b]
            if(!na||!nb) return null
            const x1=na.x+40, y1=na.y+28, x2=nb.x+40, y2=nb.y+28
            const len = Math.sqrt((x2-x1)**2+(y2-y1)**2)
            return (
              <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={C.gold} strokeWidth="2" strokeDasharray={len} strokeDashoffset={animated?0:len}
                style={{ transition: `stroke-dashoffset 0.7s ${0.1+ei*0.12}s ease` }}
                markerEnd="url(#arr)" opacity="0.55" />
            )
          })}

          {/* Flow dots traveling along edges */}
          {animated && activeEdges.map(([a,b], ei) => {
            const na=nodeMap[a], nb=nodeMap[b]
            if(!na||!nb) return null
            return (
              <circle key={`dot-${a}-${b}`} r="3.5" fill={C.gold}
                style={{ offsetPath: `path('M${na.x+40},${na.y+28} L${nb.x+40},${nb.y+28}')`,
                  animation: `flowDot ${1.8+ei*0.2}s ${0.8+ei*0.1}s linear infinite` }}
                opacity="0.8" />
            )
          })}

          {/* Nodes — staggered scale-in */}
          {activeNodes.map((n, ni) => {
            const Icon = n.icon;
            return (
              <g key={n.id} style={{ cursor:'pointer',
                transformOrigin:`${n.x+40}px ${n.y+28}px`,
                opacity: animated ? 1 : 0,
                transform: animated ? 'scale(1)' : 'scale(0.5)',
                transition: `opacity 0.4s ${0.3+ni*0.12}s, transform 0.4s ${0.3+ni*0.12}s cubic-bezier(0.34,1.56,0.64,1)` }}
                onClick={() => setHovered(hovered===n.id?null:n.id)}>
                {/* Pulse ring behind hovered node */}
                {hovered===n.id && (
                  <circle cx={n.x+40} cy={n.y+28} r="38" fill="none"
                    stroke={n.color} strokeWidth="1.5" className="diag-pulse" />
                )}
                <rect x={n.x} y={n.y} width="80" height="56" rx="12"
                  fill={hovered===n.id ? `${n.color}20` : C.surface}
                  stroke={hovered===n.id ? n.color : C.border}
                  strokeWidth={hovered===n.id ? 2.5 : 1.5}
                  filter={hovered===n.id ? 'url(#glow)' : 'none'}
                  style={{ transition: 'all .25s' }} />
                <foreignObject x={n.x + 28} y={n.y + 8} width="24" height="24">
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={n.color} strokeWidth={2} />
                  </div>
                </foreignObject>
                <text x={n.x+40} y={n.y+46} textAnchor="middle" fontSize="8.5" fill={n.color}
                  fontFamily="'DM Sans',sans-serif" fontWeight="700">{n.label.split(' ')[0]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {hovNode ? (
        <div className="fi card" style={{ padding:'14px 18px', marginBottom:14,
          borderColor:`${hovNode.color}55`, background:`${hovNode.color}08` }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            {(() => {
              const Icon = hovNode.icon;
              return <Icon size={22} color={hovNode.color} strokeWidth={1.5} />;
            })()}
            <div>
              <div style={{ fontWeight:700, color:hovNode.color, marginBottom:4 }}>{hovNode.label}</div>
              <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{hovNode.info}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding:'10px 16px', background:`${C.navy}08`, borderRadius:10, marginBottom:14,
          border:`1px solid ${C.navy}18` }}>
          <p style={{ fontSize:12, color:C.muted }}>👆 Tap any component above to learn what it does</p>
        </div>
      )}
      <button className="btn-acc" onClick={onNext} style={{ width:'100%', padding:'15px', fontSize:16 }}>
        🚀 Launch My Cloud Setup
      </button>
    </div>
  )
}

// ─── SCREEN 7: DEPLOYMENT ─────────────────────────────────────────────────
const DEPLOY_STEPS = [
  { msg:'Setting up your private cloud network',    mentor:"We just created a secure, isolated network. This keeps your system protected from outside threats." },
  { msg:'Launching your application server',         mentor:'Your application server is now live. This is where your website or app runs 24/7.' },
  { msg:'Preparing secure database storage',         mentor:"We're setting up an encrypted database to store your business data safely." },
  { msg:'Configuring automatic backups',             mentor:"Your data will be backed up automatically every day, so you never lose anything." },
  { msg:'Connecting monitoring systems',             mentor:"We're setting up health checks so you'll know instantly if anything needs attention." },
  { msg:'Finalizing security settings',              mentor:'Your setup is secured with industry-standard encryption and firewall rules.' },
  { msg:'Everything is live ✓',                     mentor:'Your cloud infrastructure is ready! Everything is running and healthy.' },
]

function Deployment({ dataNeeds, onDone }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [pct, setPct] = useState(0)
  const filteredSteps = dataNeeds==='no' ? DEPLOY_STEPS.filter((_,i)=>i!==2&&i!==3) : DEPLOY_STEPS

  useEffect(() => {
    let cancelled = false
    async function run() {
      for (let i=0; i<filteredSteps.length; i++) {
        if(cancelled) return
        setStep(i); setPct(Math.round((i/(filteredSteps.length-1))*100))
        await sleep(i===filteredSteps.length-1 ? 600 : 1400)
      }
      if(!cancelled){setPct(100); setDone(true)}
    }
    run(); return ()=>{cancelled=true}
  }, [])

  return (
    <div className="fu" style={{ maxWidth:560, margin:'0 auto', padding:'48px 24px' }}>
      <div style={{ textAlign:'center', marginBottom:32 }}>
        {done ? <div style={{ fontSize:52 }}>🎉</div> : <Spin size={40} />}
        <Syne s={{ fontSize:22, fontWeight:700, color:C.navy, display:'block', marginTop:14 }}>
          {done ? 'Your Cloud Is Live!' : 'Building Your Cloud Setup…'}
        </Syne>
        <p style={{ color:C.muted, fontSize:14, marginTop:6 }}>
          {done ? 'Everything is running and ready to go.' : 'Sit tight — this only takes a moment.'}
        </p>
      </div>
      <Prog pct={pct} />
      <div style={{ marginTop:6, textAlign:'right', marginBottom:20 }}>
        <Mono s={{ fontSize:11, color:C.gold, fontWeight:700 }}>{pct}%</Mono>
      </div>
      <div className="card" style={{ padding:16, marginBottom:16 }}>
        {filteredSteps.map((s,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12,
            padding:'10px 4px', opacity:i>step ? 0.3 : 1, transition:'opacity .3s',
            borderBottom:i<filteredSteps.length-1?`1px solid ${C.border}`:'' }}>
            <div style={{ flexShrink:0 }}>
              {i<step ? <Check size={16}/> :
               i===step&&!done ? <Spin size={16}/> :
               i===step&&done ? <Check size={16}/> :
               <div style={{width:16,height:16,borderRadius:'50%',border:`1.5px solid ${C.borderMd}`}}/>}
            </div>
            <span style={{ fontSize:13, color:i<=step?C.navy:C.muted, fontWeight:i<=step?500:400 }}>{s.msg}</span>
          </div>
        ))}
      </div>
      {!done && (
        <div className="card" style={{ padding:'14px 16px',
          borderColor:`${C.gold}44`, background:`${C.gold}0a` }}>
          <p style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
            <strong style={{ color:C.gold }}>☁️ Cloud Mentor: </strong>
            {filteredSteps[step]?.mentor}
          </p>
        </div>
      )}
      {done && (
        <button className="btn-acc fi" onClick={onDone} style={{ width:'100%', padding:'15px', fontSize:16, marginTop:4 }}>
          View My Dashboard →
        </button>
      )}
    </div>
  )
}

// ─── SCREEN 8: DASHBOARD ──────────────────────────────────────────────────
const STAT_CARDS = [
  { icon:CheckCircle2, label:'Application Status', value:'Healthy',   color:C.green,   sub:'Running normally' },
  { icon:Server, label:'Server Health',      value:'Stable',    color:C.navy,    sub:'No issues detected' },
  { icon:User, label:'Visitor Traffic',    value:'Moderate',  color:C.gold,    sub:'~42 active right now' },
  { icon:Zap, label:'Performance',        value:'Excellent', color:C.neutral, sub:'Avg 190ms response' },
]
const ADVISORIES = [
  { icon:BarChart3, text:'Your visitor traffic increased 18% this week. Everything is handling it smoothly.', action:'View Details', color:C.green },
  { icon:HardDrive, text:'Last backup completed 2 hours ago. Your data is safe and encrypted.', action:'View Backups',  color:C.navy },
  { icon:ShieldCheck, text:'Security scan completed — no threats detected. All certificates valid.', action:'View Report',  color:C.gold },
]

// ─── AI CHAT TAB ──────────────────────────────────────────────────────────
function AIChat({ bizType }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m your cloud assistant powered by LLaMA3 running locally on your Mac. Ask me anything about your infrastructure, AWS, Docker, Terraform, or DevOps.' }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [model, setModel] = useState('llama3')
  const bottomRef = useState(null)
  const chatRef = { current: null }

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    const history = messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0)
      .map(m => ({ role: m.role, content: m.content }))
    const newMsgs = [...messages, { role: 'user', content: text }]
    setMessages(newMsgs)
    setInput('')
    setStreaming(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(m => [...m, assistantMsg])

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, model, currentConfig: (() => { try { return JSON.parse(localStorage.getItem('so_output')||'null') } catch { return null } })() })
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6))
            if (json.token) {
              setMessages(m => {
                const copy = [...m]
                copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + json.token }
                return copy
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(m => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: `❌ Error: ${err.message}` }
        return copy
      })
    }
    setStreaming(false)
  }

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const SUGGESTIONS = [
    `What AWS services do I need for my ${bizType || 'app'}?`,
    'Explain auto-scaling in plain English',
    'How do I secure my RDS database?',
    'What is a VPC and why do I need it?',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 520, gap: 0 }}>
      {/* Model selector */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: C.muted }}>Model:</span>
        {['llama3', 'deepseek-coder', 'gpt-oss:20b'].map(m => (
          <button key={m} onClick={() => setModel(m)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${model === m ? C.navy : C.border}`,
              background: model === m ? `${C.navy}12` : 'transparent', color: model === m ? C.navy : C.muted, fontFamily: 'monospace' }}>
            {m}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={r => { chatRef.current = r }} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px', marginBottom: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
              borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
              borderBottomLeftRadius: msg.role === 'user' ? 14 : 4,
              background: msg.role === 'user' ? C.navy : `${C.gold}14`,
              color: msg.role === 'user' ? '#fff' : C.text,
              fontSize: 13, lineHeight: 1.65,
              border: msg.role === 'assistant' ? `1px solid ${C.gold}33` : 'none',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {msg.content || (streaming && i === messages.length - 1 ? <Spin size={12} /> : '')}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && !streaming && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => { setInput(s) }}
              style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${C.border}`, background: `${C.navy}07`, color: C.muted }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="Ask anything about your cloud setup… (Enter to send)"
          rows={2} style={{ flex: 1, resize: 'none', padding: '10px 14px', borderRadius: 12, fontSize: 13,
            border: `1.5px solid ${C.border}`, outline: 'none', fontFamily: 'inherit', color: C.text,
            background: '#fff', lineHeight: 1.5 }} />
        <button onClick={send} disabled={!input.trim() || streaming}
          className="btn-acc" style={{ padding: '10px 20px', fontSize: 13, borderRadius: 12, flexShrink: 0 }}>
          {streaming ? <Spin size={14} /> : '↑ Send'}
        </button>
      </div>
    </div>
  )
}

// ─── AI GENERATOR TAB ─────────────────────────────────────────────────────
const API_BASE = 'http://localhost:3001'

const EXAMPLE_INPUTS = [
  'Online clothing store in Chennai, about 300 visitors a day, we sell through our own website',
  'Food delivery app in Bangalore, 1,000 orders per day, need to store customer data',
  'Coaching institute website in Mumbai, 50 students, just a simple info site',
  'Handmade jewellery store in Coimbatore, just starting out, expect 100 visitors a day',
]

const GEN_STEPS = [
  'Understanding your business...',
  'Deciding the best setup for you...',
  'Writing your server configuration...',
  'Setting up your container...',
  'Creating your auto-deploy pipeline...',
  'Calculating your monthly cost...',
  'Your setup is ready ✓',
]

const OUTPUT_TABS = [
  { id:'terraform',  label:'Server setup',    techLabel:'main.tf',                     icon:'🏗️' },
  { id:'kubernetes', label:'Kubernetes',      techLabel:'k8s manifests',               icon:'☸️' },
  { id:'dockerfile', label:'Container',       techLabel:'Dockerfile',                  icon:'🐳' },
  { id:'cicd',       label:'Auto-deploy',     techLabel:'.github/workflows/deploy.yml',icon:'⚙️' },
  { id:'cost',       label:'Cost breakdown',  techLabel:'Estimate',                    icon:'📊' },
  { id:'validate',   label:'Validator',       techLabel:'HCL checks',                  icon:'🧪' },
  { id:'checklist',  label:'Next steps',      techLabel:'Deployment checklist',        icon:'✅' },
]

function parseCost(terraform='') {
  let cost = 8
  if (terraform.includes('aws_instance'))         cost += 15
  if (terraform.includes('aws_db_instance'))      cost += 25
  if (terraform.includes('aws_elasticache'))      cost += 18
  if (terraform.includes('aws_alb') || terraform.includes('aws_lb')) cost += 16
  if (terraform.includes('autoscaling'))          cost += 10
  if (terraform.includes('cloudfront'))           cost +=  5
  return cost
}

// ─── TERRAFORM VALIDATOR ──────────────────────────────────────────────────
function validateTerraform(terraform = '') {
  const items = []
  const ok   = (msg, detail) => items.push({ level:'ok',    msg, detail })
  const warn = (msg, detail) => items.push({ level:'warn',  msg, detail })
  const err  = (msg, detail) => items.push({ level:'error', msg, detail })

  if (terraform.includes('provider "aws"') || terraform.includes("provider \"aws\""))
    ok('AWS provider configured', 'Region and credentials block is present')
  else
    err('Missing AWS provider', 'Add: provider "aws" { region = "ap-south-1" }')

  if (/0\.0\.0\.0\/0/.test(terraform) && terraform.includes('ingress'))
    warn('Open ingress rule (0.0.0.0/0)', 'Port open to the entire internet — restrict to known IPs if possible')
  else if (terraform.includes('security_group'))
    ok('Firewall configured', 'Security group rules restrict incoming traffic')

  if (/storage_encrypted\s*=\s*true|encrypted\s*=\s*true/.test(terraform))
    ok('Encryption enabled', 'Data at rest is encrypted with AES-256')
  else
    warn('No encryption detected', 'Add storage_encrypted = true to RDS / EBS resources')

  if (/backup_retention_period\s*=\s*[1-9]/.test(terraform))
    ok('Backup retention configured', 'Automated daily snapshots will protect your data')
  else
    warn('No backup retention', 'Set backup_retention_period on RDS for point-in-time recovery')

  if (terraform.includes('tags'))
    ok('Resource tags present', 'Resources are tagged — helps with cost tracking and billing')
  else
    warn('No resource tags', 'Add tags = { Name, Environment, Project } to all resources')

  if (terraform.includes('ap-south-1'))
    ok('Mumbai region (ap-south-1)', 'Low-latency hosting for Indian customers')

  if (terraform.includes('cloudwatch') || terraform.includes('monitoring'))
    ok('Monitoring configured', 'CloudWatch alerts will fire if anything goes wrong')

  if (terraform.length < 120)
    err('Output appears incomplete', 'Terraform block is very short — try regenerating')

  return items
}

// ─── COST BREAKDOWN CHART ─────────────────────────────────────────────────
function parseCostBreakdown(terraform = '') {
  const rows = [
    { label:'Base (S3 + CloudWatch)', match: '',                                 cost: 8,  color: C.muted,   icon:'☁️' },
    { label:'EC2 App Server',         match: 'aws_instance',                     cost: 15, color: C.navy,    icon:'🖥️' },
    { label:'RDS Database',           match: 'aws_db_instance',                  cost: 25, color: C.gold,    icon:'🗄️' },
    { label:'ElastiCache Redis',      match: 'aws_elasticache',                  cost: 18, color: C.green,   icon:'⚡' },
    { label:'App Load Balancer',      match: 'aws_alb',                          cost: 16, color: C.neutral, icon:'⚖️' },
    { label:'Auto Scaling',           match: 'autoscaling',                      cost: 10, color: '#7B68EE', icon:'📈' },
    { label:'CloudFront CDN',         match: 'cloudfront',                       cost:  5, color: '#20B2AA', icon:'🌐' },
  ]
  const active = rows.filter(r => !r.match || terraform.includes(r.match))
  const total  = active.reduce((s, r) => s + r.cost, 0)
  return { rows: active, total }
}

function CostBreakdownChart({ terraform }) {
  const { rows, total } = parseCostBreakdown(terraform)
  const max = Math.max(...rows.map(r => r.cost))
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Estimated per-service AWS cost · Mumbai region
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 5, alignItems:'center' }}>
            <span style={{ fontSize: 13, color: C.text }}>{r.icon} {r.label}</span>
            <Mono s={{ fontSize: 12, color: r.color, fontWeight: 700 }}>
              ${r.cost}<span style={{ color: C.muted, fontWeight: 400, fontSize: 11 }}>/mo</span>
            </Mono>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: C.border, overflow:'hidden' }}>
            <div className="cost-bar" style={{
              height:'100%', borderRadius: 99, background: r.color,
              width: `${(r.cost / max) * 100}%`, animationDelay: `${i*0.08}s`
            }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop:`2px solid ${C.border}`,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>Total estimated</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>${total} USD · AWS Mumbai</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <Syne s={{ fontSize: 26, fontWeight: 800, color: C.gold }}>
            ₹{Math.round(total*83).toLocaleString('en-IN')}
            <span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>/mo</span>
          </Syne>
        </div>
      </div>
    </div>
  )
}

function parseBenefits(terraform='') {
  const b = []
  if (terraform.includes('aws_db_instance') || terraform.includes('rds'))
    b.push({ icon:'🔐', text:'Your customer data is stored in a private, encrypted database — not accessible from the internet' })
  if (terraform.includes('backup') || terraform.includes('aws_db_instance'))
    b.push({ icon:'💾', text:'Automatic daily backups — you can never permanently lose your data' })
  if (terraform.includes('cloudfront') || terraform.includes('cdn'))
    b.push({ icon:'⚡', text:'Your site loads fast everywhere in India — content is served from servers close to your customers' })
  if (terraform.includes('autoscaling') || terraform.includes('auto_scaling'))
    b.push({ icon:'📈', text:'If you go viral, your server automatically grows to handle the traffic — no action needed from you' })
  if (terraform.includes('security_group') || terraform.includes('vpc'))
    b.push({ icon:'🛡️', text:'A private network isolates your app — attackers have no direct path in' })
  if (terraform.includes('cloudwatch') || terraform.includes('monitoring'))
    b.push({ icon:'👁️', text:'You get alerted the moment anything goes wrong — before your customers notice' })
  if (b.length === 0) b.push(
    { icon:'🔐', text:'Your setup is secured with firewall rules and encrypted connections' },
    { icon:'⚡', text:'Hosted on AWS Mumbai — fast load times for customers across India' },
    { icon:'💾', text:'Your data is backed up automatically every day' },
  )
  return b.slice(0, 4)
}

function AIGenerator({ bizType, answers }) {
  const [userInput, setUserInput] = useState(() => localStorage.getItem('so_input') || '')
  const [genStep,   setGenStep]   = useState(-1)
  const [output,    setOutput]    = useState(() => { try { return JSON.parse(localStorage.getItem('so_output')||'null') } catch { return null } })
  const [kubernetes,  setKubernetes]  = useState(null)
  const [activeTab, setActiveTab] = useState('terraform')
  const [copied,    setCopied]    = useState(false)
  const [error,     setError]     = useState(null)
  const [health,    setHealth]    = useState('checking')
  const [history,   setHistory]   = useState(() => { try { return JSON.parse(localStorage.getItem('so_history')||'[]') } catch { return [] } })
  const [showHist,  setShowHist]  = useState(false)
  const [provider,  setProvider]  = useState('aws')
  const [converting, setConverting] = useState(false)
  const [convertedTf, setConvertedTf] = useState({}) // { gcp: '...', azure: '...' }
  const [explaining, setExplaining] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [vending,    setVending]     = useState(false)
  const [vendResult, setVendResult]  = useState(null)
  const isGenerating = genStep >= 0 && genStep < GEN_STEPS.length - 1

  useEffect(() => {
    fetch(`${API_BASE}/api/health`).then(r=>r.json()).then(d=>setHealth(d.ok?'ok':'offline')).catch(()=>setHealth('offline'))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey||e.ctrlKey) && e.key==='Enter' && !isGenerating) { e.preventDefault(); generate() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isGenerating, userInput, bizType, answers])

  const getDescription = () => {
    if (userInput.trim()) return userInput.trim()
    const biz = BIZ_TYPES.find(b=>b.id===bizType)?.label || 'business'
    return `${biz}, traffic: ${answers?.traffic||'small'}, database: ${answers?.dataNeeds||'yes'}`
  }

  const generate = async () => {
    setError(null); setOutput(null); setGenStep(0)
    const desc = getDescription()
    localStorage.setItem('so_input', desc)
    try {
      setGenStep(1)
      const archRes = await fetch(`${API_BASE}/api/architecture`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ bizType:bizType||'store', traffic:answers?.traffic||'small', dataNeeds:answers?.dataNeeds||'yes', description:desc })
      })
      const archData = await archRes.json()
      setGenStep(2)
      const [tfRes,dfRes,ciRes,k8sRes] = await Promise.all([
        fetch(`${API_BASE}/api/terraform`,  {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({architecture:archData.architecture})}),
        fetch(`${API_BASE}/api/dockerfile`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bizType:bizType||'store'})}),
        fetch(`${API_BASE}/api/cicd`,       {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bizType:bizType||'store'})}),
        fetch(`${API_BASE}/api/kubernetes`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bizType:bizType||'store', architecture:archData.architecture})}),
      ])
      setGenStep(3)
      const [tfData,dfData,ciData,k8sData] = await Promise.all([tfRes.json(),dfRes.json(),ciRes.json(),k8sRes.json()])
      setGenStep(4); await sleep(400); setGenStep(5); await sleep(400); setGenStep(6)
      const terraform=tfData.terraform||'', dockerfile=dfData.dockerfile||'', pipeline=ciData.pipeline||'', kubernetesManifests=k8sData.manifests||''
      const out = {
        terraform, dockerfile, pipeline, kubernetes: kubernetesManifests,
        architecture: archData.architecture,
        cost: parseCost(terraform), benefits: parseBenefits(terraform),
        secChecks: parseSecurityChecks(terraform),
        tier: archData.architecture?.tier,
        summary: archData.architecture?.reasoning || `A ${archData.architecture?.tier||'Standard'} cloud setup on AWS Mumbai — secured, backed up daily.`,
        desc: desc.slice(0,60), ts: new Date().toLocaleDateString('en-IN')
      }
      setKubernetes(kubernetesManifests)
      setOutput(out)
      localStorage.setItem('so_output', JSON.stringify(out))
      const hist = [{ id:Date.now(), desc:out.desc, tier:out.tier, cost:out.cost, ts:out.ts }, ...history].slice(0,5)
      setHistory(hist); localStorage.setItem('so_history', JSON.stringify(hist))
    } catch (err) {
      setError("Couldn't connect — make sure AI Engine is running. Open Terminal and run:  ai-engine start")
      setGenStep(-1)
    }
  }

  const copy = () => {
    if (activeTab === 'kubernetes') {
      navigator.clipboard.writeText(output?.kubernetes || kubernetes || '')
    } else {
      navigator.clipboard.writeText(output?.[activeTab==='cicd'?'pipeline':activeTab]||'')
    }
    setCopied(true); setTimeout(()=>setCopied(false), 2000)
  }

  const downloadFiles = async () => {
    if (!output) return;
    try {
      const res = await fetch(`${API_BASE}/api/export-workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          terraform: output.terraform, 
          dockerfile: output.dockerfile, 
          pipeline: output.pipeline,
          kubernetes: output.kubernetes
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(blob); 
      a.download = 'shopops-workspace.zip'; 
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback
      const blob = new Blob([`# ShopOps Setup Files — ${output.ts||''}\n\n# main.tf\n${output.terraform}\n\n# k8s-manifests.yaml\n${output.kubernetes}\n\n# Dockerfile\n${output.dockerfile}\n\n# .github/workflows/deploy.yml\n${output.pipeline}`],{type:'text/plain'})
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shopops-setup.txt'; a.click()
      URL.revokeObjectURL(a.href)
    }
  }

  const explainCode = async () => {
    if (!output) return
    const codeMap = { 
      terraform: output.terraform, 
      dockerfile: output.dockerfile, 
      cicd: output.pipeline, 
      kubernetes: output.kubernetes 
    }
    const code = codeMap[activeTab] || output.terraform
    setExplaining(true); setExplanation(null)
    try {
      const res = await fetch(`${API_BASE}/api/architecture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: `Explain this ${activeTab} file in plain English for a non-technical business owner. Be concise and friendly, max 4 bullet points:\n\n${code.slice(0, 1200)}` })
      })
      const data = await res.json()
      const text = data.architecture?.reasoning || data.architecture?.summary || JSON.stringify(data.architecture)
      setExplanation(text)
    } catch (e) { setExplanation('Could not fetch explanation — make sure AI Engine is running.') }
    setExplaining(false)
  }

  const launchLive = async () => {
    if (!output) return
    setVending(true); setVendResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/vend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bizType: answers?.bizType || 'store',
          description: userInput,
          terraform: output.terraform,
          dockerfile: output.dockerfile
        })
      })
      const data = await res.json()
      setVendResult(data)
    } catch(e) {
      setVendResult({ ok: false, error: e.message })
    }
    setVending(false)
  }

  const switchProvider = async (p) => {
    setProvider(p)
    if (p === 'aws' || !output) return
    if (convertedTf[p]) return // already cached
    setConverting(true)
    try {
      const res = await fetch(`${API_BASE}/api/provider-convert`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terraform: output.terraform, provider: p })
      })
      const data = await res.json()
      if (data.terraform) setConvertedTf(prev => ({ ...prev, [p]: data.terraform }))
    } catch { /* silently fall back to AWS code */ }
    setConverting(false)
  }

  return (
    <div>
      {!isGenerating && !output && (
        <div className="fu">
          <HealthDot status={health} />
          {history.length > 0 && (
            <div style={{marginBottom:12}}>
              <button onClick={()=>setShowHist(h=>!h)} style={{fontSize:11,color:C.muted,background:'transparent',
                border:`1px solid ${C.border}`,borderRadius:20,padding:'4px 10px',cursor:'pointer'}}>
                {showHist?'▾':'▸'} {history.length} previous setup{history.length>1?'s':''}
              </button>
              {showHist && (
                <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                  {history.map((h,i)=>(
                    <div key={h.id} className="hist-card" style={{animationDelay:`${i*0.06}s`}}
                      onClick={()=>{const s=JSON.parse(localStorage.getItem('so_output')||'null');if(s)setOutput(s)}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                        <span style={{fontSize:12,color:C.navy,fontWeight:500,flex:1}}>{h.desc}…</span>
                        <span style={{fontSize:10,color:C.muted,whiteSpace:'nowrap'}}>{h.ts}</span>
                      </div>
                      <div style={{marginTop:3,display:'flex',gap:8}}>
                        <span style={{fontSize:10,color:C.gold}}>₹{Math.round(h.cost*83).toLocaleString('en-IN')}/mo</span>
                        <span style={{fontSize:10,color:C.muted}}>{h.tier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <p style={{fontSize:13,color:C.muted,marginBottom:8}}>Try one of these:</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
            {EXAMPLE_INPUTS.map((ex,i)=>(
              <button key={i} onClick={()=>setUserInput(ex)}
                style={{fontSize:11,padding:'5px 10px',borderRadius:20,cursor:'pointer',textAlign:'left',
                  border:`1px solid ${C.border}`,background:`${C.navy}07`,color:C.muted,lineHeight:1.4,maxWidth:280,
                  animation:`fadeUp 0.35s ${i*0.07}s ease both`,opacity:0}}>
                {ex}
              </button>
            ))}
          </div>
          <textarea value={userInput} onChange={e=>setUserInput(e.target.value)} rows={3}
            placeholder="Describe your business — what you sell, where you are, how many customers you expect..."
            style={{width:'100%',padding:'12px 14px',borderRadius:12,fontSize:13,border:`1.5px solid ${C.border}`,
              outline:'none',fontFamily:'inherit',color:C.text,background:'#fff',lineHeight:1.6,resize:'vertical',marginBottom:6}} />
          <div style={{fontSize:11,color:C.muted,marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <button onClick={()=>setUserInput(EXAMPLE_INPUTS[Math.floor(Math.random()*EXAMPLE_INPUTS.length)])}
              style={{fontSize:11,padding:'3px 10px',borderRadius:20,cursor:'pointer',background:`${C.gold}14`,
                border:`1px solid ${C.gold}44`,color:C.gold,fontWeight:600}}>
              🎲 Surprise me
            </button>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{color: userInput.length > 200 ? C.green : C.muted}}>{userInput.length} chars</span>
              <span>
                <kbd style={{fontFamily:'inherit',background:`${C.navy}0a`,border:`1px solid ${C.border}`,borderRadius:4,padding:'1px 5px',fontSize:10}}>⌘</kbd>
                {' + '}<kbd style={{fontFamily:'inherit',background:`${C.navy}0a`,border:`1px solid ${C.border}`,borderRadius:4,padding:'1px 5px',fontSize:10}}>Enter</kbd>
                {' to generate'}
              </span>
            </div>
          </div>
          {error && <div style={{padding:'10px 14px',background:`${C.red}0f`,border:`1px solid ${C.red}33`,borderRadius:10,marginBottom:10,fontSize:13,color:C.red,lineHeight:1.5}}>{error}</div>}
          <button className="btn-acc" onClick={generate} style={{width:'100%',padding:'14px',fontSize:15}}>⚡ Set up my cloud</button>
        </div>
      )}

      {isGenerating && (
        <div style={{padding:'20px 0'}} className="fu">
          <div style={{textAlign:'center',marginBottom:22}}>
            <Spin size={32} />
            <p style={{fontSize:15,fontWeight:600,color:C.navy,marginTop:12}}>{GEN_STEPS[genStep]}</p>
          </div>
          {GEN_STEPS.slice(0,-1).map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',
              opacity:i>genStep?0.3:1,transform:i>genStep?'translateX(-6px)':'translateX(0)',
              transition:'opacity .4s, transform .4s',
              borderBottom:i<GEN_STEPS.length-2?`1px solid ${C.border}`:'none'}}>
              <div style={{width:18,height:18,borderRadius:'50%',flexShrink:0,transition:'all .3s',
                border:`1.5px solid ${i<genStep?C.green:i===genStep?C.gold:C.borderMd}`,
                background:i<genStep?`${C.green}18`:'transparent',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                {i<genStep&&<span style={{fontSize:9,color:C.green}}>✓</span>}
                {i===genStep&&<Spin size={9}/>}
              </div>
              <span style={{fontSize:13,color:i<=genStep?C.navy:C.muted,transition:'color .3s'}}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {output && !isGenerating && (
        <div>
          <div className="out-panel" style={{animationDelay:'0s',padding:'14px 16px',background:`${C.navy}09`,border:`1.5px solid ${C.navy}22`,borderRadius:14,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:10,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.07em'}}>What we're building for you</div>
              <div style={{display:'flex',gap:4}}>
                {[{id:'aws',label:'☁️ AWS'},{id:'gcp',label:'🟡 GCP'},{id:'azure',label:'🔷 Azure'}].map(p=>(
                  <button key={p.id} onClick={()=>switchProvider(p.id)}
                    style={{fontSize:11,padding:'3px 10px',borderRadius:20,cursor:'pointer',transition:'all .15s',
                      border:`1.5px solid ${provider===p.id?C.navy:C.border}`,
                      background:provider===p.id?`${C.navy}15`:'transparent',
                      color:provider===p.id?C.navy:C.muted,fontWeight:provider===p.id?700:400}}>
                    {converting && provider!==p.id && p.id!=='aws' ? p.label : p.label}
                    {converting && p.id!=='aws' && provider===p.id ? ' ⏳' : ''}
                  </button>
                ))}
              </div>
            </div>
            <p style={{fontSize:14,color:C.navy,lineHeight:1.7,fontWeight:500}}>{output.summary}</p>
            {output.ts&&<div style={{fontSize:10,color:C.muted,marginTop:5}}>Generated {output.ts} · Provider: <strong>{provider.toUpperCase()}</strong> {provider==='gcp'?'(asia-south1 — Mumbai)':provider==='azure'?'(centralindia)':'(ap-south-1 — Mumbai)'}</div>}
          </div>

          <div className="out-panel" style={{animationDelay:'0.08s',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,padding:'14px 16px',background:`${C.gold}12`,border:`1.5px solid ${C.gold}33`,borderRadius:14,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:3}}>Estimated monthly cost</div>
              <div className="cost-num" style={{fontSize:28,fontWeight:800,color:C.gold,lineHeight:1}}>
                ₹{Math.round(output.cost*83).toLocaleString('en-IN')}<span style={{fontSize:12,fontWeight:400,color:C.muted}}>/month</span>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>~${output.cost} USD · AWS Mumbai</div>
            </div>
            <Pill color={C.gold}>{output.tier||'Standard'}</Pill>
          </div>

          <div className="out-panel" style={{animationDelay:'0.16s',padding:'12px 14px',border:`1px solid ${C.border}`,borderRadius:14,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:C.navy,marginBottom:8}}>What ShopOps handled for you</div>
            {output.benefits.map((b,i)=>(
              <div key={i} className="sec-item" style={{animationDelay:`${0.18+i*0.06}s`}}>
                <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span>
                <span style={{fontSize:12,color:C.muted,lineHeight:1.55}}>{b.text}</span>
              </div>
            ))}
          </div>

          {output.secChecks && (
            <div className="out-panel" style={{animationDelay:'0.24s',padding:'12px 14px',border:`1px solid ${C.border}`,borderRadius:14,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.navy,marginBottom:8}}>Security checks</div>
              {output.secChecks.map((c,i)=>(
                <div key={i} className="sec-item" style={{animationDelay:`${0.26+i*0.05}s`}}>
                  <span style={{fontSize:13,fontWeight:600,color:c.pass?C.green:C.red,minWidth:14}}>{c.pass?'✓':'✗'}</span>
                  <span style={{fontSize:12,color:c.pass?C.green:C.red,opacity:c.pass?0.85:1}}>{c.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card out-panel" style={{animationDelay:'0.32s',overflow:'hidden',marginBottom:10}}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',gap:5, flexWrap:'wrap'}}>
                {[...OUTPUT_TABS, {id:'local', icon:'🔧', label:'Local Tools'}].map(t=>(
                  <button key={t.id} onClick={()=>setActiveTab(t.id)}
                    style={{fontSize:11,padding:'5px 10px',borderRadius:8,cursor:'pointer',transition:'all .15s',
                      border:`1.5px solid ${activeTab===t.id?C.navy:C.border}`,
                      background:activeTab===t.id?`${C.navy}12`:'transparent',
                      color:activeTab===t.id?C.navy:C.muted,fontWeight:activeTab===t.id?600:400}}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn-g" onClick={copy} style={{fontSize:11,padding:'5px 12px'}}>{copied?'✅ Copied':'📋 Copy'}</button>
                <button className="btn-g" onClick={explainCode} disabled={explaining}
                  style={{fontSize:11,padding:'5px 12px',background:`${C.gold}14`,borderColor:`${C.gold}44`,color:C.gold}}>
                  {explaining?<Spin size={11}/>:'💬 Explain This'}
                </button>
                <button className="btn-p" onClick={downloadFiles} style={{fontSize:11,padding:'5px 12px'}}>⬇ Download .zip</button>
                <button onClick={launchLive} disabled={vending}
                  style={{fontSize:11,padding:'5px 14px',borderRadius:8,cursor:'pointer',fontWeight:700,
                    background: vending ? '#555' : 'linear-gradient(135deg,#2D8B5A,#1a6b44)',
                    color:'#fff',border:'none',display:'flex',alignItems:'center',gap:5}}>
                  {vending ? <><Spin size={11}/> Provisioning...</> : '🚀 Launch Live'}
                </button>
              </div>
            </div>
            <div style={{padding:'5px 14px 6px',background:`${C.navy}08`,borderBottom:`1px solid ${C.border}`}}>
              <Mono s={{fontSize:10,color:C.muted}}>{OUTPUT_TABS.find(t=>t.id===activeTab)?.techLabel} · {provider.toUpperCase()}</Mono>
            </div>
            {activeTab === 'cost' ? (
              <div style={{padding:18,background:'#1C2D3F',minHeight:200}}>
                <CostBreakdownChart terraform={output.terraform} />
              </div>
            ) : activeTab === 'validate' ? (
              <div style={{padding:18,background:'#1C2D3F',minHeight:200}}>
                {validateTerraform(output.terraform).map((item, i) => (
                  <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                    <span style={{fontSize:13,color:item.level==='ok'?'#4CAF82':item.level==='warn'?'#F0C060':'#E05A4A',flexShrink:0,fontWeight:700,minWidth:16}}>
                      {item.level==='ok'?'✓':item.level==='warn'?'⚠':'✗'}
                    </span>
                    <div>
                      <div style={{fontSize:12,color:'#E8D5A3',fontWeight:600}}>{item.msg}</div>
                      <div style={{fontSize:11,color:'rgba(232,213,163,0.6)',marginTop:2}}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'local' ? (
              <LocalIntegrationControls output={output} provider={provider} />
            ) : (
              <pre style={{background:'#1C2D3F',minHeight:200,padding:18,margin:0,overflowX:'auto',
                fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,lineHeight:1.8,
                color:'#E8D5A3',whiteSpace:'pre-wrap',wordBreak:'break-word',animation:'fadeIn 0.2s ease'}}>
                {activeTab==='terraform'
                  ? (converting ? '⏳ Converting to '+provider.toUpperCase()+'...\n\nPlease wait, AI is rewriting the infrastructure code...' : (convertedTf[provider] || output.terraform))
                  : activeTab==='kubernetes'
                  ? (output.kubernetes || kubernetes || '')
                  : activeTab==='dockerfile'?output.dockerfile:output.pipeline}
              </pre>
            )}
          </div>

          {explanation && (
            <div className="fi" style={{padding:'14px 16px',background:`${C.gold}0f`,border:`1.5px solid ${C.gold}44`,
              borderRadius:14,marginBottom:10,animation:'fadeUp 0.3s ease both'}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>💬 Plain-English Explanation</div>
              <p style={{fontSize:13,color:C.text,lineHeight:1.75,whiteSpace:'pre-wrap'}}>{explanation}</p>
              <button onClick={()=>setExplanation(null)} style={{marginTop:8,fontSize:11,color:C.muted,background:'transparent',border:'none',cursor:'pointer'}}>✕ Dismiss</button>
            </div>
          )}

          <button className="btn-g" onClick={()=>{setOutput(null);setGenStep(-1);setExplanation(null)}} style={{fontSize:12,padding:'7px 16px'}}>
            ← Try a different business
          </button>
        </div>
      )}
    </div>
  )
}

function LocalIntegrationControls({ output, provider }) {
  const [dockerState, setDockerState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('so_docker_state') || 'null') } catch { return { containerId: null, port: 8080, logs: '', status: 'idle' } }
  })
  const [liveLogs, setLiveLogs] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [loadTestState, setLoadTestState] = useState({ running: false, results: null })
  const [localstackState, setLocalstackState] = useState({ running: false, output: null })
  const [actState, setActState] = useState({ running: false, output: null })
  const [diagramCode, setDiagramCode] = useState(null)
  const [k8sState, setK8sState] = useState({ running: false, output: null })
  const [deployAllState, setDeployAllState] = useState({ running: false, steps: [], currentStep: '' })
  const [awsState, setAwsState] = useState({ running: false, output: null, currentStep: '' })

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('so_docker_state', JSON.stringify(dockerState))
  }, [dockerState])

  // Stream Docker logs when containerId is available
  useEffect(() => {
    if (!dockerState.containerId || !showLogs) return
    setLiveLogs('Connecting to container logs...\n')

    const eventSource = new EventSource(`${API_BASE}/api/docker/logs?containerId=${dockerState.containerId}`)

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'stdout' || data.type === 'stderr') {
          setLiveLogs(prev => prev + data.log)
        } else if (data.type === 'done' || data.type === 'error') {
          setLiveLogs(prev => prev + (data.error || '\n--- Stream ended ---\n'))
          eventSource.close()
        }
      } catch {}
    }

    eventSource.onerror = () => {
      setLiveLogs(prev => prev + '\n--- Connection closed ---\n')
      eventSource.close()
    }

    return () => eventSource.close()
  }, [dockerState.containerId, showLogs])

  const handleDockerDeploy = async () => {
    if (!output?.dockerfile) return alert('No Dockerfile available')
    setDockerState(prev => ({ ...prev, status: 'building', logs: 'Building container...' }))
    try {
      const res = await fetch(`${API_BASE}/api/docker/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dockerfile: output.dockerfile, contextPath: './' })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Docker deploy failed')
      setDockerState({
        containerId: data.containerId || null,
        port: data.port || 8080,
        status: data.status || 'running',
        logs: data.output || 'Deployed successfully',
      })
    } catch (e) {
      setDockerState(prev => ({ ...prev, status: 'error', logs: e.message || String(e) }))
    }
  }

  const handleDeployAll = async () => {
    setDeployAllState({ running: true, steps: [], currentStep: '' })

    const res = await fetch(`${API_BASE}/api/deploy-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dockerfile: output?.dockerfile,
        terraform: output?.terraform,
        kubernetes: output?.kubernetes,
        port: dockerState.port || 8080
      })
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          setDeployAllState(prev => ({
            ...prev,
            currentStep: data.step,
            steps: [...prev.steps, data]
          }))
        } catch {}
      }
    }

    setDeployAllState(prev => ({ ...prev, running: false }))
  }

  const handleKubernetesApply = async () => {
    if (!output?.kubernetes) return alert('No Kubernetes manifests available')
    setK8sState({ running: true, output: null })
    try {
      const res = await fetch(`${API_BASE}/api/kubernetes/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifests: output.kubernetes })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Kubernetes apply failed')
      setK8sState({ running: false, output: data })
    } catch (e) {
      setK8sState({ running: false, output: { error: e.message || String(e) } })
    }
  }

  const handleDockerControl = async (action) => {
    if (!dockerState.containerId) return
    try {
      const res = await fetch(`${API_BASE}/api/docker/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: dockerState.containerId, action })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Container action failed')
      setDockerState(prev => ({
        ...prev,
        status: data.status || (action === 'stop' ? 'stopped' : (action === 'pause' ? 'paused' : 'running')),
        logs: data.output || prev.logs,
      }))
    } catch (e) {
      setDockerState(prev => ({ ...prev, status: 'error', logs: e.message || String(e) }))
    }
  }

  const handleLoadTest = async () => {
    setLoadTestState({ running: true, results: null })
    try {
      const targetUrl = `http://localhost:${dockerState.port || 8080}`
      const res = await fetch(`${API_BASE}/api/loadtest/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, connections: 50, duration: 10 })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Load test failed')
      setLoadTestState({ running: false, results: data.result || data })
    } catch (e) {
      setLoadTestState({ running: false, results: { error: e.message || String(e) } })
    }
  }

  const handleLocalStack = async () => {
    if (!output?.terraform) return
    if (provider !== 'aws') {
      setLocalstackState({
        running: false,
        output: { error: 'LocalStack deployment is available for AWS Terraform only. Switch provider to AWS first.' }
      })
      return
    }
    setLocalstackState({ running: true, output: null })
    try {
      const res = await fetch(`${API_BASE}/api/localstack/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terraform: output.terraform })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || data.details || 'LocalStack deploy failed')
      setLocalstackState({ running: false, output: data })
    } catch (e) {
      setLocalstackState({ running: false, output: { error: e.message || String(e) } })
    }
  }

  const handleAwsDeploy = async () => {
    const deployDescription = getDescription()
    if (!output?.terraform && !deployDescription) return alert('No deployment context available')
    if (!confirm('⚠️ This will deploy REAL resources to your AWS account and may incur charges. Continue?')) return

    setAwsState({ running: true, output: null, currentStep: 'Initializing' })

    try {
      const res = await fetch(`${API_BASE}/api/aws/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terraform: output?.terraform || '',
          architecture: output?.architecture || null,
          bizType: bizType || 'store',
          traffic: answers?.traffic || 'small',
          dataNeeds: answers?.dataNeeds || 'yes',
          description: deployDescription,
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            setAwsState(prev => ({
              ...prev,
              currentStep: data.status === 'done' ? 'Complete' : data.message,
              output: data.error ? { error: data.error } : { message: data.message }
            }))
          } catch {}
        }
      }

      setAwsState(prev => ({ ...prev, running: false }))
    } catch (e) {
      setAwsState({ running: false, output: { error: e.message || String(e) }, currentStep: '' })
    }
  }

  const handleAct = async () => {
    if (!output?.pipeline) return
    setActState({ running: true, output: null })
    try {
      const res = await fetch(`${API_BASE}/api/act/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowYml: output.pipeline, event: 'push' })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || data.details || 'act run failed')
      setActState({ running: false, output: data })
    } catch (e) {
      setActState({ running: false, output: { error: e.message || String(e) } })
    }
  }

  const handleGenerateDiagram = async () => {
    if (!output?.architecture?.diagram) {
      const res = await fetch(`${API_BASE}/api/architecture/diagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: (output?.desc || '') + ' ' + (output?.summary || '') })
      })
      const data = await res.json()
      setDiagramCode(data.mermaid)
    } else {
      setDiagramCode(output.architecture.diagram)
    }
  }

  return (
    <div style={{ padding: '16px', background: '#1C2D3F', minHeight: 300 }}>
      {/* Deploy All Button */}
      <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#4CAF82', marginBottom: '4px' }}>🚀 Deploy Everything</div>
            <div style={{ fontSize: '11px', color: '#888' }}>Docker + LocalStack + Kubernetes (one click)</div>
          </div>
          <button
            className="btn-p"
            onClick={handleDeployAll}
            disabled={deployAllState.running || !output?.dockerfile}
            style={{ fontSize: '12px', padding: '8px 20px', background: deployAllState.running ? '#666' : 'linear-gradient(135deg,#4CAF82,#2E7D32)' }}
          >
            {deployAllState.running ? `⚡ ${deployAllState.currentStep}...` : '🚀 Deploy All'}
          </button>
        </div>
        {deployAllState.steps.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {deployAllState.steps.map((s, i) => (
              <span key={i} style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: s.status === 'done' ? 'rgba(76,175,80,0.3)' : s.status === 'error' ? 'rgba(224,90,74,0.3)' : 'rgba(240,192,96,0.3)',
                color: s.status === 'done' ? '#4CAF82' : s.status === 'error' ? '#E05A4A' : '#F0C060'
              }}>
                {s.step}: {s.status}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {/* Docker Card */}
        <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,213,163,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Mono s={{ fontSize: 11, color: '#E8D5A3' }}>🐳 Docker</Mono>
            <Pill color={dockerState.status === 'running' ? '#4CAF82' : dockerState.status === 'error' ? '#E05A4A' : C.gold}>
              {dockerState.status}
            </Pill>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button className="btn-p" onClick={handleDockerDeploy} style={{ fontSize: '11px', padding: '6px 12px' }}>
              Deploy
            </button>
            {dockerState.containerId && (
              <>
                <button className="btn-g" onClick={() => setShowLogs(!showLogs)} style={{ fontSize: '11px', padding: '6px 12px' }}>
                  {showLogs ? 'Hide Logs' : '📜 Logs'}
                </button>
                <button className="btn-g" onClick={() => handleDockerControl('stop')} style={{ fontSize: '11px', padding: '6px 12px', color: '#E05A4A' }}>Stop</button>
                {dockerState.status === 'running' && (
                  <a href={`http://localhost:${dockerState.port || 8080}`} target="_blank" rel="noreferrer">
                    <button className="btn-p" style={{ fontSize: '11px', padding: '6px 12px' }}>
                      Visit →
                    </button>
                  </a>
                )}
              </>
            )}
          </div>
          {showLogs && (
            <div style={{ marginTop: '8px' }}>
              <textarea
                readOnly
                value={liveLogs}
                style={{
                  width: '100%',
                  height: '120px',
                  background: '#0a1520',
                  border: '1px solid #2A3D52',
                  borderRadius: '4px',
                  color: '#4CAF82',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  padding: '8px',
                  resize: 'vertical'
                }}
                placeholder="Container logs will appear here..."
              />
            </div>
          )}
          {dockerState.logs && !showLogs && <pre style={{ fontSize: '10px', color: '#888', margin: 0, maxHeight: 80, overflow: 'auto' }}>{dockerState.logs.slice(-500)}</pre>}
        </div>

        {/* Kubernetes Card */}
        <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,213,163,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Mono s={{ fontSize: 11, color: '#E8D5A3' }}>☸️ Kubernetes</Mono>
            <Pill color={k8sState.running ? C.gold : C.green}>
              {k8sState.running ? 'Deploying' : 'Ready'}
            </Pill>
          </div>
          <button className="btn-p" onClick={handleKubernetesApply} disabled={k8sState.running || !output?.kubernetes} style={{ fontSize: '11px', padding: '6px 12px', width: '100%' }}>
            {k8sState.running ? 'Applying to minikube...' : 'Apply to minikube'}
          </button>
          {k8sState.output && (
            <pre style={{ fontSize: '10px', color: '#888', margin: '10px 0 0', maxHeight: 100, overflow: 'auto' }}>
              {k8sState.output.output || k8sState.output.error || JSON.stringify(k8sState.output, null, 2)}
            </pre>
          )}
        </div>

        {/* AWS Card */}
        {provider === 'aws' && (
          <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(240,192,96,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Mono s={{ fontSize: 11, color: '#F0C060' }}>☁️ REAL AWS</Mono>
              <Pill color={awsState.running ? C.gold : '#F0C060'}>
                {awsState.running ? 'Deploying' : 'Ready'}
              </Pill>
            </div>
            <button
              className="btn-p"
              onClick={handleAwsDeploy}
              disabled={awsState.running || !output?.terraform}
              style={{ fontSize: '11px', padding: '6px 12px', width: '100%', background: awsState.running ? '#666' : 'linear-gradient(135deg,#F0C060,#C08A30)' }}
            >
              {awsState.running ? `⚡ ${awsState.currentStep || 'Deploying...'}...` : 'Deploy to AWS ⚠️'}
            </button>
            {awsState.output && (
              <pre style={{ fontSize: '10px', margin: '10px 0 0', maxHeight: 100, overflow: 'auto', color: awsState.output.error ? '#E05A4A' : '#4CAF82' }}>
                {awsState.output.error || awsState.output.message || JSON.stringify(awsState.output, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* LocalStack Card */}
        <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,213,163,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Mono s={{ fontSize: 11, color: '#E8D5A3' }}>☁️ LocalStack</Mono>
            <Pill color={localstackState.running ? C.gold : C.green}>
              {localstackState.running ? 'Running' : 'Idle'}
            </Pill>
          </div>
          <button className="btn-p" onClick={handleLocalStack} disabled={localstackState.running || provider !== 'aws'} style={{ fontSize: '11px', padding: '6px 12px', width: '100%' }}>
            {provider !== 'aws' ? 'Switch to AWS for LocalStack' : localstackState.running ? 'Deploying...' : 'Deploy to LocalStack'}
          </button>
          {localstackState.output && (
            <pre style={{ fontSize: '10px', color: '#888', margin: '10px 0 0', maxHeight: 100, overflow: 'auto' }}>
              {localstackState.output.output || localstackState.output.error || JSON.stringify(localstackState.output, null, 2)}
            </pre>
          )}
        </div>

        {/* act (GitHub Actions) Card */}
        <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,213,163,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Mono s={{ fontSize: 11, color: '#E8D5A3' }}>⚡ act</Mono>
            <Pill color={actState.running ? C.gold : C.green}>
              {actState.running ? 'Running' : 'Idle'}
            </Pill>
          </div>
          <button className="btn-p" onClick={handleAct} disabled={actState.running} style={{ fontSize: '11px', padding: '6px 12px', width: '100%' }}>
            {actState.running ? 'Running...' : 'Run Workflow Locally'}
          </button>
          {actState.output && (
            <pre style={{ fontSize: '10px', color: '#888', margin: '10px 0 0', maxHeight: 100, overflow: 'auto' }}>
              {actState.output.output || actState.output.error || JSON.stringify(actState.output, null, 2)}
            </pre>
          )}
        </div>

        {/* autocannon (Load Test) Card */}
        <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,213,163,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Mono s={{ fontSize: 11, color: '#E8D5A3' }}>📈 autocannon</Mono>
            <Pill color={loadTestState.running ? C.gold : C.green}>
              {loadTestState.running ? 'Running' : 'Idle'}
            </Pill>
          </div>
          <button className="btn-p" onClick={handleLoadTest} disabled={loadTestState.running} style={{ fontSize: '11px', padding: '6px 12px', width: '100%' }}>
            {loadTestState.running ? 'Testing...' : 'Start Load Test'}
          </button>
          {loadTestState.results && (
            <div style={{ marginTop: 10, fontSize: '11px', color: '#E8D5A3' }}>
              {loadTestState.results.error ? loadTestState.results.error : (
                <div>
                  <div>Requests: {loadTestState.results.requests?.total || loadTestState.results.requests?.average || '-'}</div>
                  <div>Avg Latency: {loadTestState.results.latency?.average || '-'}</div>
                  <div>Throughput: {loadTestState.results.throughput?.average || '-'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mermaid Diagram */}
      <div className="card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,213,163,0.12)', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Mono s={{ fontSize: 11, color: '#E8D5A3' }}>📐 Architecture Diagram</Mono>
          <button className="btn-g" onClick={handleGenerateDiagram} style={{ fontSize: '11px', padding: '6px 12px' }}>
            {diagramCode ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        {diagramCode ? (
          <div style={{ padding: '12px', background: '#FAF7F2', borderRadius: '8px' }}>
            <MermaidDiagram code={diagramCode} />
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
            Click "Generate" to create a visual diagram!
          </div>
        )}
      </div>
    </div>
  )
}

function Dashboard({ bizType, answers, onReset }) {
  const [tab, setTab] = useState('overview')
  const [showDestroy, setShowDestroy] = useState(false)
  const [paused, setPaused] = useState(false)
  const [destroying, setDestroying] = useState(false)
  const [destroyError, setDestroyError] = useState(null)
  const [metrics, setMetrics] = useState({ cpu: 0, ramMB: 0, status: 'running', network: 'Normal', lat: '0' })
  const bizLabel = BIZ_TYPES.find(b=>b.id===bizType)?.label || 'Application'

  // Fetch real (or simulated) Docker stats every 2 seconds
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/docker/stats`)
        const data = await res.json()
        if (data.ok) {
          setMetrics(data)
          setPaused(data.status === 'paused')
        }
      } catch (e) {
        // Fallback to simulated data if endpoint fails
        setMetrics({ 
          cpu: Math.floor(Math.random() * 50 + 10), 
          ramMB: Math.floor(Math.random() * 500 + 100), 
          status: 'running',
          network: 'Normal',
          lat: Math.floor(Math.random() * 100 + 50)
        })
      }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, 2000)
    return () => clearInterval(interval)
  }, []);

  const sendControl = async (action) => {
    if (action === 'pause') setPaused(true);
    if (action === 'resume') setPaused(false);
    await fetch(`${API_BASE}/api/controls`, {
      method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action})
    }).catch(console.error);
  };

  const destroyEverything = async () => {
    setDestroying(true)
    setDestroyError(null)
    try {
      const res = await fetch(`${API_BASE}/api/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json().catch(() => null)
      if (!res.ok && !data?.summary) throw new Error(data?.error || 'Destroy failed')
      onReset()
    } catch (err) {
      setDestroyError(err.message || String(err))
    } finally {
      setDestroying(false)
      setShowDestroy(false)
    }
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
      <div className="fi" style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <Syne s={{ fontSize:22, fontWeight:700, color:C.navy, display:'block' }}>{bizLabel} Dashboard</Syne>
          <p style={{ fontSize:13, color:C.muted, marginTop:4 }}>Your cloud is running — here's everything in plain English.</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="pulsedot" style={{ width:8, height:8, borderRadius:'50%',
            background: paused ? C.gold : C.green, display:'inline-block' }} />
          <Pill color={paused ? C.gold : C.green}>{paused ? 'Paused' : 'Live'}</Pill>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {['overview','advisor','ai','chat','controls'].map(t => (
          <button key={t} className={`tab ${tab===t?'on':'off'}`} onClick={()=>setTab(t)}>
            {t==='overview'?'📊 Overview':t==='advisor'?'🤖 Advisor':t==='ai'?'⚡ Set up my cloud':t==='chat'?'💬 Ask AI':'⚙️ Controls'}
          </button>
        ))}
      </div>

      {tab==='overview' && (
        <div className="fi">
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <Pill color={C.green}>🟢 Live Metrics (Docker)</Pill>
            <span style={{fontSize:12,color:C.muted}}>Stats fetched every 2 seconds</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
            <div className="card card-hov" style={{ padding:18, animation:`fadeUp 0.35s 0.00s ease both`, opacity:0 }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{'✅'}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{'Application Status'}</div>
              <Syne s={{ fontSize:18, fontWeight:700, color:paused ? C.gold : C.green, display:'block' }}>{paused ? 'Paused' : 'Healthy'}</Syne>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{paused ? 'Containers stopped' : 'Running normally'}</div>
            </div>
            <div className="card card-hov" style={{ padding:18, animation:`fadeUp 0.35s 0.07s ease both`, opacity:0 }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{'🖥️'}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{'CPU Usage (Simulated)'}</div>
              <Syne s={{ fontSize:18, fontWeight:700, color: metrics.cpu > 50 ? C.red : C.navy, display:'block' }}>{metrics.cpu}%</Syne>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{metrics.ramMB} MB RAM</div>
            </div>
            <div className="card card-hov" style={{ padding:18, animation:`fadeUp 0.35s 0.14s ease both`, opacity:0 }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{'👥'}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{'Network Load'}</div>
              <Syne s={{ fontSize:18, fontWeight:700, color: metrics.network === 'High Load' ? C.gold : C.navy, display:'block' }}>{metrics.network}</Syne>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Traffic monitor active</div>
            </div>
            <div className="card card-hov" style={{ padding:18, animation:`fadeUp 0.35s 0.21s ease both`, opacity:0 }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{'⚡'}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{'Latency'}</div>
              <Syne s={{ fontSize:18, fontWeight:700, color:C.neutral, display:'block' }}>{metrics.lat}ms</Syne>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Average response time</div>
            </div>
          </div>
          <div className="card" style={{ padding:20 }}>
            <Syne s={{ fontSize:14, fontWeight:600, color:C.navy, display:'block', marginBottom:14 }}>
              Visitor Activity (Last 14 Days)
            </Syne>
            <MiniChart />
          </div>
        </div>
      )}

      {tab==='ai' && <AIGenerator bizType={bizType} answers={answers} />}

      {tab==='chat' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill color={C.green}>🟢 AI Engine Connected</Pill>
            <span style={{ fontSize: 12, color: C.muted }}>Running locally on your Mac</span>
          </div>
          <AIChat bizType={bizType} />
        </div>
      )}

      {tab==='advisor' && (
        <div className="fi" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ padding:'14px 16px', background:`${C.navy}09`,
            border:`1.5px solid ${C.navy}22`, borderRadius:12, marginBottom:4 }}>
            <p style={{ fontSize:13, color:C.muted }}>
              🤖 <strong style={{ color:C.navy }}>Your Smart Advisor</strong> monitors your setup 24/7 and gives you plain-English guidance.
            </p>
          </div>
          {ADVISORIES.map((a,i) => (
            <div key={i} className="card" style={{ padding:18, display:'flex',
              alignItems:'flex-start', gap:14, borderColor:`${a.color}33` }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{a.icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, color:C.text, marginBottom:10, lineHeight:1.6 }}>{a.text}</p>
                <button className="btn-g" style={{ fontSize:12, padding:'6px 14px' }}>{a.action}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='controls' && (
        <div className="fi" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <Syne s={{ fontSize:15, fontWeight:600, color:C.navy, display:'block' }}>
                  {paused ? '▶️  Resume Infrastructure' : '⏸  Pause Infrastructure'}
                </Syne>
                <p style={{ fontSize:13, color:C.muted, marginTop:4 }}>
                  {paused ? 'Resume your cloud. Billing restarts.' : 'Temporarily pause. Billing stops while paused.'}
                </p>
              </div>
              <button className="btn-p" onClick={() => sendControl(paused ? 'resume' : 'pause')}>
                {paused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <Syne s={{ fontSize:15, fontWeight:600, color:C.navy, display:'block' }}>🔄 Simulate Traffic Spike</Syne>
                <p style={{ fontSize:13, color:C.muted, marginTop:4 }}>Send a burst of simulated traffic to test your infrastructure monitoring.</p>
              </div>
              <button className="btn-g" onClick={() => sendControl('spike')}>Send Traffic</button>
            </div>
          </div>
          <div className="card" style={{ padding:20, borderColor:`${C.red}33` }}>
            {!showDestroy ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div>
                  <Syne s={{ fontSize:15, fontWeight:600, color:C.red, display:'block' }}>🗑  Delete Cloud Setup</Syne>
                  <p style={{ fontSize:13, color:C.muted, marginTop:4 }}>Permanently removes all resources and stops billing.</p>
                </div>
                <button className="destroy-btn" onClick={()=>setShowDestroy(true)}>Delete</button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize:14, color:C.red, marginBottom:16, fontWeight:600 }}>
                  ⚠️ Are you sure? This will permanently delete everything.
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="destroy-btn" onClick={destroyEverything} disabled={destroying}>
                    {destroying ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button className="btn-g" onClick={()=>setShowDestroy(false)} disabled={destroying}>Cancel</button>
                </div>
              </div>
            )}
            {destroyError && (
              <p style={{ fontSize:12, color:C.red, marginTop:10 }}>{destroyError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FLOATING CHAT WIDGET ─────────────────────────────────────────────────
function FloatingChat({ bizType }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* Bubble button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 24, right: 18, zIndex: 9999,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: `linear-gradient(135deg, ${C.navy}, ${C.gold})`,
        boxShadow: '0 4px 20px rgba(33,64,94,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        transition: 'transform 0.2s',
      }}>
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 12, zIndex: 9998,
          width: 'min(380px, calc(100vw - 24px))', maxHeight: 'min(70vh, 640px)', borderRadius: 20,
          background: C.surface, boxShadow: '0 8px 40px rgba(33,64,94,0.22)',
          border: `1.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', background: C.navy, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>ShopOps AI</div>
              <div style={{ fontSize: 11, color: `rgba(255,255,255,0.6)` }}>Ask anything about your cloud setup</div>
            </div>
            <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          </div>
          {/* Chat body */}
          <div style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
            <AIChat bizType={bizType} />
          </div>
        </div>
      )}
    </>
  )
}

// Define all steps for easy navigation
const ALL_STEPS = [
  { id: 0, label: 'Welcome', icon: '🏠', requires: [] },
  { id: 1, label: 'Business', icon: '🏪', requires: [] },
  { id: 2, label: 'Traffic', icon: '📊', requires: [1] },
  { id: 3, label: 'Data Needs', icon: '🗄️', requires: [2] },
  { id: 4, label: 'Cost', icon: '💰', requires: [3] },
  { id: 5, label: 'Diagram', icon: '📐', requires: [4] },
  { id: 6, label: 'Deploy', icon: '🚀', requires: [5] },
  { id: 7, label: 'Dashboard', icon: '📈', requires: [6] },
]

// ─── APP ──────────────────────────────────────────────────────────────────
function LegacyApp() {
  const [step,      setStep]      = useState(() => { try{return parseInt(localStorage.getItem('so_step')||'0',10)}catch{return 0} })
  const [bizType,   setBizType]   = useState(() => localStorage.getItem('so_biz')||null)
  const [traffic,   setTraffic]   = useState(() => localStorage.getItem('so_traffic')||null)
  const [dataNeeds, setDataNeeds] = useState(() => localStorage.getItem('so_data')||null)
  const [darkMode,  setDarkMode]  = useState(() => localStorage.getItem('so_dark')==='1')
  
  // Check if a step is accessible
  const isStepAccessible = (targetStep) => {
    if (targetStep === 0) return true
    if (targetStep <= step) return true
    const required = ALL_STEPS[targetStep]?.requires || []
    return required.every(req => {
      if (req === 1) return bizType !== null
      if (req === 2) return traffic !== null
      if (req === 3) return dataNeeds !== null
      if (req === 4) return dataNeeds !== null && traffic !== null
      if (req === 5) return true
      if (req === 6) return true
      return true
    })
  }

  useEffect(() => {
    const palette = darkMode ? CD : CL
    Object.assign(C, palette)
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    document.body.style.background = darkMode ? CD.bg : CL.bg
    localStorage.setItem('so_dark', darkMode ? '1' : '0')
  }, [darkMode])
  const setStepP  = v => { setStep(v);      localStorage.setItem('so_step',    String(v)) }
  const setBizP   = v => { setBizType(v);   localStorage.setItem('so_biz',     v||'') }
  const setTrafP  = v => { setTraffic(v);   localStorage.setItem('so_traffic', v||'') }
  const setDataP  = v => { setDataNeeds(v); localStorage.setItem('so_data',    v||'') }

  useEffect(() => {
    const handler = (e) => {
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`)
      document.documentElement.style.setProperty('--my', `${e.clientY}px`)
    }
    window.addEventListener('pointermove', handler, { passive: true })
    return () => window.removeEventListener('pointermove', handler)
  }, [])

  const reset = () => {
    setStep(0); setBizType(null); setTraffic(null); setDataNeeds(null)
    ;['so_step','so_biz','so_traffic','so_data'].forEach(k=>localStorage.removeItem(k))
  }

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <div className="spotlight" />
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">☁️</span>
          <span className="brand-text">ShopOps</span>
          {/* Compact Step Indicator */}
          <Pill color={C.navy} style={{ marginLeft: '12px' }}>
            Step {step + 1} of {ALL_STEPS.length} • {ALL_STEPS[step].label}
          </Pill>
        </div>

        <div className="topbar-actions">
          <button className="btn-g hide-sm" onClick={() => setStepP(7)}>Live Dashboard</button>
          <button className="btn-g" onClick={() => setDarkMode(d => !d)}
            style={{ fontSize: 16, padding: '7px 12px', borderRadius: 10 }}
            title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {step === 0 && (
          <Welcome
            onStart={() => setStepP(1)}
            onDemo={() => setStepP(7)}
            onChatComplete={(req) => {
              setBizP(req.bizType);
              setTrafP(req.traffic);
              setDataP(req.dataNeeds);
              setStepP(4); // Jump directly to CostPreview
            }}
          />
        )}
        {step === 1 && (
          <BusinessType
            value={bizType}
            onChange={setBizP}
            onNext={() => setStepP(2)}
            onBack={() => setStepP(0)}
          />
        )}
        {step === 2 && (
          <Traffic
            value={traffic}
            onChange={setTrafP}
            onNext={() => setStepP(3)}
            onBack={() => setStepP(1)}
          />
        )}
        {step === 3 && (
          <DataNeeds
            value={dataNeeds}
            onChange={setDataP}
            onNext={() => setStepP(4)}
            onBack={() => setStepP(2)}
          />
        )}
        {step === 4 && (
          <CostPreview
            traffic={traffic}
            dataNeeds={dataNeeds}
            onNext={() => setStepP(5)}
            onBack={() => setStepP(3)}
          />
        )}
        {step === 5 && (
          <InfraDiagram
            dataNeeds={dataNeeds}
            onNext={() => setStepP(6)}
            onBack={() => setStepP(4)}
          />
        )}
        {step === 6 && (
          <Deployment
            dataNeeds={dataNeeds}
            onDone={() => setStepP(7)}
          />
        )}
        {step === 7 && (
          <Dashboard
            bizType={bizType}
            answers={{ traffic, dataNeeds }}
            onReset={reset}
          />
        )}
      </main>

      <footer className="app-footer">
        <span className="mono">ShopOps · Describe your business. We handle the cloud.</span>
        <span className="muted">AI running locally · No data leaves your machine</span>
      </footer>

      {/* Mini Floating Navigation Widget */}
      <div style={{ 
        position: 'fixed', bottom: '20px', left: '20px', 
        zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px'
      }}>
        {/* Quick Step Selector */}
        <div className="card glass" style={{ padding: '10px', minWidth: '180px' }}>
          <select
            value={step}
            onChange={(e) => {
              const targetStep = parseInt(e.target.value)
              if (isStepAccessible(targetStep)) setStepP(targetStep)
            }}
            style={{
              width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`,
              borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: C.navy,
              background: 'transparent', cursor: 'pointer'
            }}
          >
            {ALL_STEPS.map((s, i) => {
              const isAccessible = isStepAccessible(s.id)
              return (
                <option key={s.id} value={s.id} disabled={!isAccessible}>
                  {s.icon} {s.label}
                  {!isAccessible && ' (Locked)'}
                </option>
              )
            })}
          </select>
        </div>

        {/* Back & Next Mini Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button className="btn-g" onClick={() => setStepP(step - 1)} style={{ padding: '8px 14px', fontSize: '13px' }}>
              ←
            </button>
          )}
          {step < 7 && (step < 1 || (step === 1 && bizType) || (step === 2 && traffic) || (step === 3 && dataNeeds) || step === 4 || step === 5 || step === 6) && (
            <button className="btn-p" onClick={() => setStepP(step + 1)} style={{ padding: '8px 14px', fontSize: '13px' }}>
              →
            </button>
          )}
        </div>
      </div>

      <FloatingChat bizType={bizType} />
    </div>
  )
}

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/local-cloud-health')) {
    return <LocalCloudHealth />
  }
  return <ConsultantExperience />
}
