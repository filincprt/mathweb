import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { QuizQuestion } from '../types'
import CustomKeyboard from '../components/CustomKeyboard'

const isMobileDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function Quiz() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('')
  const [usedHint, setUsedHint] = useState(false)
  const [hint, setHint] = useState('')
  const [timer, setTimer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [details, setDetails] = useState<any[]>([])
  const navigate = useNavigate()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const setup = useMemo(() => {
    return JSON.parse(localStorage.getItem('lastSetup') || '{}') as any
  }, [])

  useEffect(() => {
    ;(async () => {
      const cfg = { ...setup, count: setup.count || 10 }
      const res = await apiFetch('/api/quiz/generate', { method: 'POST', body: JSON.stringify(cfg) })
      const data = await res.json()
      setQuestions(data)
      if (cfg.timerEnabled) {
        setTimer(cfg.timerSeconds)
        setTimeLeft(cfg.timerSeconds)
      }
    })()
  }, [setup])

  useEffect(() => {
    if (timer && questions.length) {
      setTimeLeft(timer)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            submitAnswer('')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [timer, currentIndex, questions.length])

  const current = questions[currentIndex]
  const progressPercent = questions.length ? Math.round(((currentIndex) / questions.length) * 100) : 0

  const correctAnswer = useMemo(() => {
    if (!current) return 0
    return current.op === 'mul' ? current.a * current.b : current.a / current.b
  }, [current])

  const showHint = () => {
    if (!current) return
    setUsedHint(true)
    if (current.op === 'mul') {
      setHint(`Это ${current.a} групп по ${current.b}`)
    } else {
      setHint(`Деление означает найти, сколько раз ${current.b} умещается в ${current.a}`)
    }
  }

  const submitAnswer = async (input: string) => {
    if (!current) return
    const start = Date.now()
    const answerValue = input !== undefined ? input : answer
    const userAnswer = Number(answerValue)
    const correct = userAnswer === correctAnswer
    setFeedback(correct ? 'correct' : 'wrong')
    const duration = timer ? (timer - timeLeft) * 1000 : 2000
    const nextDetails = [...details, {
      ...current,
      answer: userAnswer,
      correct,
      usedHint,
      durationMs: duration,
      correctAnswer,
    }]
    setDetails(nextDetails)
    setAnswer('')
    setHint('')
    setUsedHint(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeout(() => setFeedback(''), 800)
    if (currentIndex + 1 >= questions.length) {
      const correctCount = nextDetails.filter((item) => item.correct).length
      const total = questions.length
      const percent = Math.round((correctCount / total) * 100)
      const baseScore = nextDetails.reduce((sum, item) => {
        let points = item.correct ? (item.usedHint ? 5 : 10) : 0
        if (item.correct && item.durationMs <= 3000) points += 5
        else if (item.correct && item.durationMs <= 5000) points += 3
        else if (item.correct && item.durationMs <= 10000) points += 1
        return sum + points
      }, 0)
      const maxStreak = nextDetails.reduce((acc, item) => { if (item.correct) acc.current += 1; else acc.current = 0; acc.max = Math.max(acc.max, acc.current); return acc }, { current: 0, max: 0 }).max
      const streakBonus = maxStreak >= 10 ? 25 : maxStreak >= 5 ? 10 : 0
      const score = baseScore + streakBonus
      const stars = percent >= 90 ? 5 : percent >= 75 ? 4 : percent >= 60 ? 3 : percent >= 40 ? 2 : 1
      const payload = { correct: correctCount, total, percent, score, stars, operation: setup.operation || 'mix', tables: setup.tables || Array.from({ length: 10 }, (_, i) => i + 1), details: nextDetails }
      localStorage.setItem('lastRun', JSON.stringify(payload))
      try {
        await apiFetch('/api/quiz/result', { method: 'POST', body: JSON.stringify(payload) })
      } catch {
        // если нет токена, сохраняем локально
      }
      navigate('/results')
    } else {
      setCurrentIndex((index) => index + 1)
    }
  }

  if (!questions.length) return <div className="card max-w-lg mx-auto">Загрузка...</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Вопрос {currentIndex + 1} из {questions.length}</div>
          <div className="h-2 mt-2 w-full rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${progressPercent}%` }} /></div>
        </div>
        {timer ? <div className="font-bold text-primary">{timeLeft}s</div> : null}
      </div>
      <div className="rounded-3xl bg-violet-50 p-8 text-center shadow-sm">
        <div className="text-4xl font-bold">{current.op === 'mul' ? `${current.a} × ${current.b}` : `${current.a} ÷ ${current.b}`}</div>
        <div className="text-2xl mt-3">= ?</div>
      </div>
      <div className="space-y-3">
        <div className="text-center text-sm text-gray-600">Подсказка снижает балл, но помогает быстрее понять задачу.</div>
        <div className="flex gap-2 justify-center">
          <button className="px-4 py-2 rounded-xl bg-slate-100" onClick={showHint}>Показать подсказку</button>
        </div>
        {hint && <div className="rounded-xl bg-yellow-100 p-3 text-sm text-yellow-900">{hint}</div>}
      </div>
      <div className="grid gap-3">
        <input className="w-full rounded-3xl border border-gray-300 p-4 text-center text-3xl font-bold" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, ''))} inputMode={isMobileDevice() ? 'numeric' : 'decimal'} pattern="[0-9]*" placeholder="Введите ответ" autoFocus={!isMobileDevice()} readOnly={isMobileDevice()} />
        <div className="flex gap-2 justify-center">
          <button className="flex-1 bg-primary text-white px-4 py-3 rounded-3xl" onClick={() => submitAnswer(answer)}>Ответить</button>
        </div>
        {isMobileDevice() && <CustomKeyboard value={answer} onChange={setAnswer} onDelete={() => setAnswer((prev) => prev.slice(0, -1))} onSubmit={() => submitAnswer(answer)} />}
      </div>
      <AnimatePresence>{feedback && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-3 rounded-2xl text-white text-center ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {feedback === 'correct' ? 'Верно! Отлично!' : `Неверно. Правильный ответ: ${correctAnswer}`}
        </motion.div>
      )}</AnimatePresence>
    </motion.div>
  )
}
