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

export const Mod285 = (exp: number): number => {
  // base case: the exponent is 8
  if (exp == 8)
    return 29 // return 2^8 mod 285
  if (exp < 8) // or its less than 8
    return Math.pow(2, exp) // return itself as a power of 2
  // recursive case: n is greater than 256
  let r = 2 * Mod285(exp - 1)
  if (r >= 256)
    r ^= 285
  return r
}

// export const NumToGF256 = (n: number): Term[] => {
//   // if the number n is too large to be represented in GF(256), then we need to mod it
//   if (n >= 256) {
//     const r = Mod285(n)
//     return NumToGF256(r)
//   }
//   const terms: Term[] = []
//   let p = 0
//   while (Math.pow(2, p) < n && p < 8) {
//     p++
//   }
//   return terms
// }

export const GF256AlphaToInt: number[] = []
for (let i = 0; i < 256; i++)
  GF256AlphaToInt[i] = Mod285(i)

export const GF256IntToAlpha: number[] = []
GF256IntToAlpha[0] = -1
for (let i = 1; i < 256; i++)
  GF256IntToAlpha[i] = GF256AlphaToInt.indexOf(i)