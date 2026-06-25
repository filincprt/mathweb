export type QuizOperation = 'mul' | 'div' | 'mix'

export type QuizQuestion = {
  a: number
  b: number
  op: QuizOperation
}

export type QuestionState = QuizQuestion & {
  answer: string
  correct?: boolean
  usedHint: boolean
  durationMs: number
  correctAnswer: number
}

export type QuizSetup = {
  operation: QuizOperation
  tables: number[]
  order: 'random' | 'order'
  count: number
}

export type QuizResult = {
  correct: number
  total: number
  percent: number
  score: number
  stars: number
  runId?: number
  earnedAchievements: string[]
  mistakes: QuestionState[]
}

export type DashboardStats = {
  totalRuns: number
  averagePercent: number
  bestPercent: number
  bestDate: string
  streak: number
  trend: Array<{ label: string; percent: number }>
  heatmap: number[][]
}

export type RunSummary = {
  id: number
  date: string
  operation: QuizOperation
  tables: number[]
  total: number
  correct: number
  percent: number
  score: number
}

export type Achievement = {
  key: string
  name: string
  description: string
  achieved_at: string
  custom: boolean
}
