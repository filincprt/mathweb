import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function Login(){
  const [nick, setNick] = useState('')
  const [pass, setPass] = useState('')
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async () => {
    const url = mode === 'login' ? '/api/login' : '/api/register'
    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL||'') + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick, password: pass })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Ошибка авторизации')
      }
      const body = await res.json()
      localStorage.setItem('access', body.access_token)
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const guestMode = () => {
    localStorage.setItem('guest', '1')
    navigate('/setup')
  }

  return (
    <div className="max-w-md mx-auto card p-6 space-y-4">
      <h2 className="text-xl font-bold">{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
      <input className="w-full p-3 rounded-xl border" placeholder="Никнейм" value={nick} onChange={e=>setNick(e.target.value)} />
      <input className="w-full p-3 rounded-xl border" placeholder="Пароль" value={pass} onChange={e=>setPass(e.target.value)} type="password" />
      <div className="flex flex-col sm:flex-row gap-3">
        <button className="flex-1 bg-primary text-white px-4 py-3 rounded-xl" onClick={submit}>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        <button className="flex-1 border border-gray-300 px-4 py-3 rounded-xl" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode === 'login' ? 'Создать аккаунт' : 'Уже есть?'}</button>
      </div>
      <button className="w-full bg-slate-100 px-4 py-3 rounded-xl" onClick={guestMode}>Войти как гость</button>
      {error && <div className="text-red-600">{error}</div>}
      <p className="text-sm text-gray-500">Гостевой режим сохраняет прогресс в браузере — позже можно привязать аккаунт.</p>
    </div>
  )
}
