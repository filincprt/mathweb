import { useMemo } from 'react'
import { useQuizStore } from '../store/useQuizStore'

export function useProgress() {
  const questions = useQuizStore((state) => state.questions)
  const currentIndex = useQuizStore((state) => state.currentIndex)

  return useMemo(() => {
    const total = questions.length
    const answered = questions.slice(0, currentIndex).filter((q) => q.answer !== '').length
    const percent = total === 0 ? 0 : Math.round((answered / total) * 100)
    return { total, answered, percent }
  }, [questions, currentIndex])
}
