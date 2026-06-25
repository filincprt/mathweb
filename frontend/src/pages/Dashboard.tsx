import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { apiFetch } from '../lib/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

type TrendItem = { label: string; percent: number }

type DashboardData = {
  totalRuns: number
  averagePercent: number
  bestPercent: number
  bestDate: string | null
  streak: number
  trend: TrendItem[]
  heatmap: number[][]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [runs, setRuns] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [custom, setCustom] = useState({ key: '', name: '', description: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/api/dashboard')
        setData(await res.json())
        const runsRes = await apiFetch('/api/runs')
        setRuns(await runsRes.json())
        const achRes = await apiFetch('/api/achievements')
        setAchievements(await achRes.json())
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  const submitCustom = async () => {
    setMessage('')
    try {
      const res = await apiFetch('/api/achievements/custom', {
        method: 'POST',
        body: JSON.stringify(custom),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      setMessage('Пользовательское достижение создано!')
      setCustom({ key: '', name: '', description: '' })
      const refresh = await apiFetch('/api/achievements')
      setAchievements(await refresh.json())
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  if (!data) return <div className="card max-w-4xl mx-auto">Загрузка статистики...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4"><div className="text-sm text-gray-500">Всего прогонов</div><div className="text-3xl font-bold">{data.totalRuns}</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Средний балл</div><div className="text-3xl font-bold">{data.averagePercent}%</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Лучший результат</div><div className="text-3xl font-bold">{data.bestPercent}%</div><div className="text-xs text-gray-500">{data.bestDate}</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Серия дней подряд</div><div className="text-3xl font-bold">{data.streak}</div></div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4">
        <h3 className="text-lg font-semibold mb-3">График успеваемости</h3>
        <Line data={{ labels: data.trend.map((item) => item.label), datasets: [{ label: '% правильных', data: data.trend.map((item) => item.percent), borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.18)', tension: 0.4 }] }} options={{ responsive: true, plugins: { tooltip: { enabled: true } } }} />
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="card p-4">
          <h3 className="text-lg font-semibold mb-3">Тепловая карта ошибок</h3>
          <div className="grid grid-cols-10 gap-0.5">
            {data.heatmap.flatMap((row, i) => row.map((value, j) => {
              const intensity = Math.min(1, value / 8)
              const color = `rgba(220, 38, 38, ${intensity})`
              return <div key={`${i}-${j}`} className="h-10 flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: color }}>{value || '-'}</div>
            }))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card p-4 col-span-2">
          <h3 className="text-lg font-semibold mb-3">История прогонов</h3>
          <div className="space-y-3">
            {runs.length ? runs.map((run) => (
              <div key={run.id} className="p-3 rounded-2xl border border-gray-200 bg-slate-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="font-semibold">{run.operation === 'mix' ? 'Микс' : run.operation === 'mul' ? 'Умножение' : 'Деление'}</div>
                    <div className="text-sm text-gray-500">{new Date(run.date).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{run.percent}%</div>
                    <div className="text-sm text-gray-500">{run.correct}/{run.total}</div>
                  </div>
                </div>
              </div>
            )) : <div className="text-gray-500">История пока пуста — начни тренироваться.</div>}
          </div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4">
        <h3 className="text-lg font-semibold mb-3">Ачивки</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {achievements.length ? achievements.map((ach) => (
            <div key={ach.key} className="rounded-2xl border p-3 bg-white shadow-sm">
              <div className="font-semibold">{ach.name}</div>
              <div className="text-sm text-gray-500">{ach.description}</div>
            </div>
          )) : <div className="text-gray-500">Пока нет достижений — начни первый прогон!</div>}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4">
        <h3 className="text-lg font-semibold mb-3">Создать своё достижение</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="p-3 rounded-xl border" placeholder="Ключ" value={custom.key} onChange={(e) => setCustom({ ...custom, key: e.target.value })} />
          <input className="p-3 rounded-xl border" placeholder="Название" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <input className="p-3 rounded-xl border" placeholder="Описание" value={custom.description} onChange={(e) => setCustom({ ...custom, description: e.target.value })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className="bg-primary text-white px-4 py-2 rounded-xl" onClick={submitCustom}>Сохранить достижение</button>
          {message && <div className="text-sm text-gray-600">{message}</div>}
        </div>
      </motion.div>
    </div>
  )
}
