import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Setup from './pages/Setup'
import Quiz from './pages/Quiz'
import Results from './pages/Results'

export default function App(){
  return (
    <div className="min-h-screen">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">MathWeb</h1>
        <nav className="space-x-3">
          <Link to="/">Кабинет</Link>
          <Link to="/setup">Тренировка</Link>
        </nav>
      </header>
      <main className="p-4">
        <Routes>
          <Route path="/" element={<Dashboard/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/setup" element={<Setup/>} />
          <Route path="/quiz" element={<Quiz/>} />
          <Route path="/results" element={<Results/>} />
        </Routes>
      </main>
    </div>
  )
}
