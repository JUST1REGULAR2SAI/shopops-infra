import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Database, Server, Cloud, Gauge, Clock3 } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './LocalCloudHealth.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

function seededSeries(base, points, spread, floor = 0) {
  const out = []
  let n = base
  for (let i = 0; i < points; i += 1) {
    const drift = Math.sin(i * 0.85) * spread * 0.55 + (Math.random() - 0.5) * spread
    n = Math.max(floor, n + drift)
    out.push(Number(n.toFixed(1)))
  }
  return out
}

function ServiceBadge({ name, state }) {
  const good = ['running', 'available', 'healthy'].includes(String(state).toLowerCase())
  return (
    <div className="lh-service-card">
      <div>
        <p className="lh-service-name">{name.toUpperCase()}</p>
        <h4>{state}</h4>
      </div>
      {good ? <CheckCircle2 size={20} className="lh-good" /> : <AlertTriangle size={20} className="lh-warn" />}
    </div>
  )
}

export default function LocalCloudHealth() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const qs = useMemo(() => new URLSearchParams(window.location.search), [])

  useEffect(() => {
    const url = `${API_BASE}/api/local-cloud/health?${qs.toString()}`
    setLoading(true)
    setError('')

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Health request failed (${res.status})`)
        return res.json()
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message || 'Unable to load local cloud health.'))
      .finally(() => setLoading(false))
  }, [qs])

  const chartData = useMemo(() => {
    if (!data?.metrics) return []
    const cpu = seededSeries(Number(data.metrics.cpuPercent || 30), 10, 5, 5)
    const latency = seededSeries(Number(data.metrics.p95LatencyMs || 90), 10, 14, 20)
    const errors = seededSeries(Number(data.metrics.errorRatePercent || 0.1), 10, 0.05, 0.01)

    return cpu.map((v, i) => ({
      tick: `T-${9 - i}`,
      cpu: Number(v.toFixed(1)),
      latency: Number(latency[i].toFixed(1)),
      errors: Number(errors[i].toFixed(2)),
    }))
  }, [data])

  const workloadBars = useMemo(() => {
    if (!data?.workload) return []
    const labelMap = [
      ['App', data.workload.appService],
      ['Queue', data.workload.queueService],
      ['Data', data.workload.dataService],
      ['CDN', data.workload.cdnService],
    ]
    return labelMap.map(([key, name], idx) => ({
      service: key,
      label: name,
      score: 70 + ((name.length + idx * 7) % 25),
    }))
  }, [data])

  return (
    <div className="lh-shell">
      <div className="lh-container">
        <header className="lh-header">
          <div>
            <p className="lh-eyebrow">LOCAL CLOUD HEALTH</p>
            <h1>Prompt-aligned sandbox telemetry</h1>
            <p className="lh-sub">
              Synthetic demo data generated from your architecture prompt. Safe for live classroom demos.
            </p>
          </div>
          <a className="lh-back" href="/">Back to CloudCraft</a>
        </header>

        {loading && <div className="lh-state">Loading health dashboard…</div>}
        {error && <div className="lh-state is-error">{error}</div>}

        {!loading && !error && data && (
          <>
            <section className="lh-kpi-grid">
              <article className="lh-kpi-card">
                <Gauge size={18} />
                <div>
                  <p>CPU (current)</p>
                  <h3>{data.metrics?.cpuPercent ?? '-'}%</h3>
                </div>
              </article>
              <article className="lh-kpi-card">
                <Clock3 size={18} />
                <div>
                  <p>P95 Latency</p>
                  <h3>{data.metrics?.p95LatencyMs ?? '-'} ms</h3>
                </div>
              </article>
              <article className="lh-kpi-card">
                <Activity size={18} />
                <div>
                  <p>Error Rate</p>
                  <h3>{data.metrics?.errorRatePercent ?? '-'}%</h3>
                </div>
              </article>
              <article className="lh-kpi-card">
                <Database size={18} />
                <div>
                  <p>Data Layer</p>
                  <h3>{data.workload?.dataService || 'N/A'}</h3>
                </div>
              </article>
            </section>

            <section className="lh-service-grid">
              {Object.entries(data.services || {}).map(([name, state]) => (
                <ServiceBadge key={name} name={name} state={state} />
              ))}
            </section>

            <section className="lh-chart-grid">
              <article className="lh-panel">
                <h3>CPU and latency trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d6e3f8" />
                    <XAxis dataKey="tick" stroke="#62738f" />
                    <YAxis yAxisId="left" stroke="#62738f" />
                    <YAxis yAxisId="right" orientation="right" stroke="#62738f" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#0f766e" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className="lh-panel">
                <h3>Workload stability score</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={workloadBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d6e3f8" />
                    <XAxis dataKey="service" stroke="#62738f" />
                    <YAxis stroke="#62738f" domain={[0, 100]} />
                    <Tooltip formatter={(v, _n, p) => [`${v}%`, p?.payload?.label || '']} />
                    <Bar dataKey="score" fill="#15803d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </section>

            <section className="lh-panel lh-full">
              <h3>Error-rate pulse</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6e3f8" />
                  <XAxis dataKey="tick" stroke="#62738f" />
                  <YAxis stroke="#62738f" />
                  <Tooltip />
                  <Area type="monotone" dataKey="errors" stroke="#b45309" fill="#f59e0b" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="lh-panel lh-full">
              <h3>Architecture illustration</h3>
              <div className="lh-arch">
                <div className="lh-node"><Cloud size={16} /> Users</div>
                <div className="lh-connector" />
                <div className="lh-row">
                  <div className="lh-node is-primary"><Server size={16} /> {data.workload?.appService || 'Application API'}</div>
                  <div className="lh-node"><Activity size={16} /> {data.workload?.queueService || 'Queue'}</div>
                  <div className="lh-node"><Database size={16} /> {data.workload?.dataService || 'Data Store'}</div>
                </div>
              </div>
              <p className="lh-note">{data.note}</p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
