import { useEffect } from 'react'
import { useQuizStore } from '../store/useQuizStore'
import { apiFetch } from '../lib/api'
import { QuizSetup } from '../types'

export function useQuiz() {
  const setup = useQuizStore((state) => state.setup)
  const setSetup = useQuizStore((state) => state.setSetup)
  const setQuestions = useQuizStore((state) => state.setQuestions)
  const finishQuiz = useQuizStore((state) => state.finishQuiz)
  const questions = useQuizStore((state) => state.questions)
  const currentIndex = useQuizStore((state) => state.currentIndex)
  const result = useQuizStore((state) => state.result)

  useEffect(() => {
    if (!questions.length) return
    localStorage.setItem('quizQuestions', JSON.stringify(questions))
  }, [questions])

  const loadQuiz = async (customSetup?: QuizSetup) => {
    const cfg = customSetup || setup
    if (!cfg.tables || cfg.tables.length === 0) {
      cfg.tables = Array.from({ length: 10 }, (_, i) => i + 1)
    }
    const res = await apiFetch('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(cfg),
    })
    if (!res.ok) throw new Error('Не удалось создать квиз')
    const data = await res.json()
    setQuestions(data)
  }

  return { setup, setSetup, loadQuiz, questions, currentIndex, result, finishQuiz }
}
