import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Results(){
  const navigate = useNavigate()
  const run = JSON.parse(localStorage.getItem('lastRun')||'null')
  if(!run) return <div className="card max-w-md mx-auto">Нет результата</div>

  const mistakes = run.details?.filter((item: any) => !item.correct) || []
  const stars = Array.from({ length: run.stars }, (_, i) => i + 1)

  const title = useMemo(() => {
    if (run.percent >= 90) return 'Молодец! Ты супер!' 
    if (run.percent >= 75) return 'Отличный результат' 
    if (run.percent >= 60) return 'Хорошо, можно лучше' 
    return 'Не сдавайся, попробуй ещё раз' 
  }, [run.percent])

  return (
    <div className="card max-w-3xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">{title}</h2>
        <div className="text-2xl mb-1">{run.percent}% правильных</div>
        <div className="flex justify-center gap-1 mb-3">{stars.map((star) => <span key={star} className="text-amber-400 text-3xl">★</span>)}</div>
        <div className="text-sm text-gray-600">Баллы: {run.score}, время: {Math.round((run.details?.reduce((sum: number, item: any) => sum + item.durationMs, 0) || 0) / run.total / 1000)} сек/вопрос</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center"><div className="text-sm text-gray-500">Правильно</div><div className="text-2xl font-bold">{run.correct}</div></div>
        <div className="card p-4 text-center"><div className="text-sm text-gray-500">Всего</div><div className="text-2xl font-bold">{run.total}</div></div>
        <div className="card p-4 text-center"><div className="text-sm text-gray-500">Звёзд</div><div className="text-2xl font-bold">{run.stars}</div></div>
      </div>
      {mistakes.length ? (
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-3">Ошибки</h3>
          <div className="space-y-3">
            {mistakes.map((item: any, idx: number) => (
              <div key={idx} className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <div className="font-semibold">{item.op === 'mul' ? `${item.a} × ${item.b}` : `${item.a} ÷ ${item.b}`} = {item.correctAnswer}</div>
                <div className="text-sm text-gray-600">Твой ответ: {item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-4 bg-emerald-50 text-emerald-900">Все ответы правильные! Отличная работа.</div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button className="bg-primary text-white px-4 py-3 rounded-xl" onClick={() => navigate('/quiz')}>Ещё раз</button>
        <button className="px-4 py-3 rounded-xl border border-gray-300" onClick={() => navigate('/setup')}>Изменить настройки</button>
        <button className="px-4 py-3 rounded-xl border border-gray-300" onClick={() => navigate('/')}>В кабинет</button>
        {mistakes.length ? <button className="px-4 py-3 rounded-xl border border-primary text-primary" onClick={() => {
          localStorage.setItem('lastSetup', JSON.stringify({ ...JSON.parse(localStorage.getItem('lastSetup') || '{}'), count: mistakes.length }))
          navigate('/quiz')
        }}>Повторить ошибки</button> : null}
      </div>
    </div>
  )
}
