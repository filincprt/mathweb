import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Setup(){
  const [operation, setOperation] = useState<'mul'|'div'|'mix'>('mix')
  const [tables, setTables] = useState<number[]>([])
  const [order, setOrder] = useState<'random'|'order'>('random')
  const [count, setCount] = useState<number>(10)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(10)
  const navigate = useNavigate()

  const toggleTable = (n:number)=>{
    setTables(t=> t.includes(n) ? t.filter(x=>x!==n) : [...t,n])
  }

  const start = async ()=>{
    const cfg = { operation, tables, order, count, timerEnabled, timerSeconds }
    localStorage.setItem('lastSetup', JSON.stringify(cfg))
    navigate('/quiz')
  }

  return (
    <div className="max-w-2xl mx-auto card">
      <h2 className="text-xl font-bold mb-2">Настройка тренировки</h2>
      <div className="mb-3">
        <label className="block mb-1">Тип операции</label>
        <div className="flex gap-2">
          <button onClick={()=>setOperation('mul')} className={`px-3 py-2 rounded ${operation==='mul'? 'bg-primary text-white':''}`}>Умножение</button>
          <button onClick={()=>setOperation('div')} className={`px-3 py-2 rounded ${operation==='div'? 'bg-primary text-white':''}`}>Деление</button>
          <button onClick={()=>setOperation('mix')} className={`px-3 py-2 rounded ${operation==='mix'? 'bg-primary text-white':''}`}>Микс</button>
        </div>
      </div>
      <div className="mb-3">
        <label className="block mb-1">Таблицы</label>
        <div className="flex flex-wrap gap-2">
          {Array.from({length:10}).map((_,i)=>{
            const n=i+1
            return <button key={n} onClick={()=>toggleTable(n)} className={`w-10 h-10 rounded-full ${tables.includes(n)?'bg-accent text-white':'bg-gray-100'}`}>{n}</button>
          })}
          <button onClick={()=>setTables([])} className="px-3 py-1 rounded border">Сброс</button>
          <button onClick={()=>setTables(Array.from({length:10}).map((_,i)=>i+1))} className="px-3 py-1 rounded border">Выбрать все</button>
        </div>
      </div>
      <div className="mb-3">
        <label className="block mb-1">Порядок</label>
        <select value={order} onChange={e=>setOrder(e.target.value as any)} className="p-2 rounded">
          <option value="order">По порядку</option>
          <option value="random">Случайный</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block mb-1">Количество</label>
        <div className="flex flex-wrap gap-2">
          {[10,20,30,50].map(n=> <button key={n} onClick={()=>setCount(n)} className={`px-3 py-2 rounded ${count===n? 'bg-primary text-white':''}`}>{n}</button>)}
          <button onClick={()=>setCount(9999)} className={`px-3 py-2 rounded ${count===9999? 'bg-primary text-white':''}`}>Все</button>
        </div>
      </div>
      <div className="mb-3">
        <label className="block mb-1">Таймер</label>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={()=>setTimerEnabled(!timerEnabled)} className={`px-3 py-2 rounded ${timerEnabled? 'bg-primary text-white':'bg-gray-100'}`}>{timerEnabled ? 'Включён' : 'Выключен'}</button>
          <select value={timerSeconds} onChange={e=>setTimerSeconds(Number(e.target.value))} disabled={!timerEnabled} className="p-2 rounded border">
            {[5,10,15,30].map((value)=> <option key={value} value={value}>{value} секунд</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={start} className="bg-primary text-white px-4 py-2 rounded">Старт</button>
      </div>
    </div>
  )
}
