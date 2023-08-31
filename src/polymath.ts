export type Term = {
  coeficient: number
  exponent: number
}

export const ParsePolynomial = (polynomial: string): Term[] => {
  const terms: Term[] = []
  const termRegx = /(\d+)?x?(\^-?\d+)?/g // regex my beloved
  const coefficientRegex = /\d+/
  const matches = polynomial.match(termRegx)

  if (matches === null) return []

  for (const match of matches) {
    if (match === '')
      continue
    const coefficient = Number.parseInt(match.split('x').at(0) ? match.split('x').at(0) ?? '1' : '1')
    const temp = match.split('^').at(1)?.match(coefficientRegex)![0]
    const power = Number.parseInt(temp ?? (match.includes('x') ? '1' : '0'))
    terms.push({ coeficient: coefficient, exponent: power })
  }
  return terms
}

export const PolynomialToBitString = (polynomial: Term[] | string): boolean[] => {
  if (typeof polynomial === 'string')
    polynomial = ParsePolynomial(polynomial)

  const maxPower = Math.max(...polynomial.map((x) => x.exponent))

  const bitString: boolean[] = []
  // bitString.fill(false, 0, maxPower + 1) // dunno why this wont let me just do (false, maxpower + 1)
  for (let i = 0; i < maxPower + 1; i++)
    bitString.push(false)

  polynomial.forEach((term: Term) => {
    bitString[term.exponent] = true
  })

  return bitString
}
