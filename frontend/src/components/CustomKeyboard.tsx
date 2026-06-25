import React from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onDelete: () => void
  onSubmit: () => void
}

export default function CustomKeyboard({ value, onChange, onDelete, onSubmit }: Props) {
  const digits = ['1','2','3','4','5','6','7','8','9','0']
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 text-center text-3xl font-bold">{value || '—'}</div>
      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit) => (
          <button key={digit} className="aspect-square rounded-3xl bg-slate-100 text-xl font-bold" onClick={() => onChange(value + digit)}>{digit}</button>
        ))}
        <button className="aspect-square rounded-3xl bg-rose-100 text-xl font-bold" onClick={onDelete}>DEL</button>
        <button className="aspect-square rounded-3xl bg-sky-100 text-xl font-bold" onClick={onSubmit}>OK</button>
      </div>
    </div>
  )
}
