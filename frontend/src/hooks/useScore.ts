import { useMemo } from 'react'
import { QuizResult } from '../types'

export function useScore(result?: QuizResult) {
  return useMemo(() => {
    if (!result) return { grade: 0, summary: '' }
    const grade = result.stars
    const summary = grade >= 4 ? 'Отлично!' : grade === 3 ? 'Хорошо' : 'Есть куда расти'
    return { grade, summary }
  }, [result])
}
