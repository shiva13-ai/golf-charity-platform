import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

// Calculate prize pool distribution from subscriber count
export function calculatePrizePools(subscriberCount: number, monthlyRate = 9.99) {
  const totalPool = subscriberCount * monthlyRate * 0.5 // 50% goes to prizes
  return {
    jackpot: totalPool * 0.4,
    match4: totalPool * 0.35,
    match3: totalPool * 0.25,
    total: totalPool,
  }
}

// Check how many numbers match between user scores and draw numbers
export function checkMatches(userScores: number[], winningNumbers: number[]): number {
  return userScores.filter(s => winningNumbers.includes(s)).length
}

// Run a draw - random mode
export function runRandomDraw(): number[] {
  const numbers: number[] = []
  while (numbers.length < 5) {
    const n = Math.floor(Math.random() * 45) + 1
    if (!numbers.includes(n)) numbers.push(n)
  }
  return numbers.sort((a, b) => a - b)
}
