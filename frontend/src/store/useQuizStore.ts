import { create } from 'zustand'
import { QuizSetup, QuizQuestion, QuestionState, QuizResult } from '../types'

type State = {
  setup: QuizSetup
  questions: QuestionState[]
  currentIndex: number
  result?: QuizResult
  achievements: string[]
  setSetup: (setup: QuizSetup) => void
  setQuestions: (questions: QuizQuestion[]) => void
  answerQuestion: (answer: string, durationMs: number, usedHint: boolean) => void
  finishQuiz: () => void
  resetQuiz: () => void
}

export const useQuizStore = create<State>((set, get) => ({
  setup: { operation: 'mix', tables: [], order: 'random', count: 10 },
  questions: [],
  currentIndex: 0,
  achievements: [],
  setSetup: (setup) => set({ setup, currentIndex: 0, result: undefined }),
  setQuestions: (questions) => set({
    questions: questions.map((q) => ({
      ...q,
      answer: '',
      usedHint: false,
      durationMs: 0,
      correctAnswer: q.op === 'mul' ? q.a * q.b : q.a / q.b,
    })),
    currentIndex: 0,
  }),
  answerQuestion: (answer, durationMs, usedHint) => {
    const { questions, currentIndex } = get()
    const question = questions[currentIndex]
    const correctAnswer = question.correctAnswer
    const value = Number(answer)
    const isCorrect = value === correctAnswer
    const updatedQuestion = {
      ...question,
      answer,
      correct: isCorrect,
      usedHint,
      durationMs,
    }
    const nextQuestions = [...questions]
    nextQuestions[currentIndex] = updatedQuestion
    const nextIndex = currentIndex + 1
    set({ questions: nextQuestions, currentIndex: nextIndex })
    if (nextIndex >= nextQuestions.length) {
      get().finishQuiz()
    }
  },
  finishQuiz: () => {
    const { questions } = get()
    const correct = questions.filter((q) => q.correct).length
    const total = questions.length
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100)
    const baseScore = questions.reduce((sum, q) => {
      let points = q.correct ? (q.usedHint ? 5 : 10) : 0
      if (q.correct && q.durationMs <= 3000) points += 5
      else if (q.correct && q.durationMs <= 5000) points += 3
      else if (q.correct && q.durationMs <= 10000) points += 1
      return sum + points
    }, 0)
    const streakBonus = (() => {
      let maxStreak = 0
      let current = 0
      questions.forEach((q) => {
        if (q.correct) {
          current += 1
          maxStreak = Math.max(maxStreak, current)
        } else {
          current = 0
        }
      })
      if (maxStreak >= 10) return 25
      if (maxStreak >= 5) return 10
      return 0
    })()
    const score = baseScore + streakBonus
    const stars = percent >= 90 ? 5 : percent >= 75 ? 4 : percent >= 60 ? 3 : percent >= 40 ? 2 : 1
    const achieved = new Set<string>()
    if (questions.every((q) => q.correct && q.durationMs < 5000)) achieved.add('lightning')
    if (questions.every((q) => q.correct && !q.usedHint)) achieved.add('perfect')
    if (questions.some((q) => q.op === 'mul' && q.a === 7 && !q.usedHint && q.correct)) {
      const sevens = questions.filter((q) => q.op === 'mul' && q.a === 7)
      if (sevens.length && sevens.every((q) => q.correct)) achieved.add('master-sevens')
    }
    set({ result: { correct, total, percent, score, stars, earnedAchievements: Array.from(achieved), mistakes: questions.filter((q) => !q.correct) } })
  },
  resetQuiz: () => set({ questions: [], currentIndex: 0, result: undefined }),
}))
