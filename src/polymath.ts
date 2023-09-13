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

// array structure:
// suppose we had the polynomial x^2 + ax + x + a
// it would be represented as [0, 2, 1, 1, 0, 1, 1, 0]
// every 2 elements is one term, 
// with the first number being the alpha exponent and the second being the x exponent
// arrays that are separated must be multiplied together, and every group of 2 elements is added together
// Let GGP be the set that encapsulates all the generator polynomials
// Let GF := {0, 1, 2, 3, ..., 256} and let GenGeneratorPoly:Z->GF
// We use this formula Π{i=0}{n-1}(x-a^i) to structurally define GenGeneratorPoly
// as (x - a^0) ∈ GGP, xσ ∈ if x ∈ GGP
// GenGeneratorPoly(d) 
export const GenGeneratorPoly = (degree: number): number[] => {
  // if the degree is zero, return an empty array
  if (degree == 0)
    return []
  // base case: degree is 1, return (x - a^0) [0, 1, 0, 0]
  if (degree == 1) {
    return [0, 1, 0, 0]
  } else { // otherwise
    // the current term group is (x - a^dgree) * GenGeneratorPoly(degree - 1)
    const ctg = [0, 1, degree - 1, 0] // current term group
    const ptg = GenGeneratorPoly(degree - 1) // previous term group
    // foil the current term group with the previous term group
    const rtg: number[] = [] // resulting term group
    for (let c = 0; c < ctg.length; c += 2) {
      for (let p = 0; p < ptg.length; p += 2) {
        // make sure that the alpha exponent is less than 255
        let raExp = ctg[c] + ptg[p]
        if (raExp > 255)
          raExp = (raExp % 256) + Math.floor(raExp / 256)
        rtg.push(
          raExp /* add alpha exponent */,
          ctg[c + 1] + ptg[p + 1] /* add x exponent */
        )
      }
    }
    // combine like terms
    const stg: number[] = [] // simplified term group
    for (let i = 0; i < rtg.length; i += 2) {
      // get the element at the current index, and add it to the appropriate index in the simplified term group
      const alphaExp = rtg[i]
      const xExp = rtg[i + 1]
      let found = false
      // attempt to find a term of the same x degree
      for (let j = 0; j < stg.length; j += 2) {
        if (stg[j + 1] == xExp) {
          // recall addition in GF(256) is just XOR
          // TODO swap with alpha value, and xor, then swap back to alpha
          // swap the alpha exponent with the alpha value
          const aExpVal = GF256AlphaToInt[stg[j]]
          // swap the alpha exponent of what we are adding with the alpha value
          const aExpVal2 = GF256AlphaToInt[alphaExp]
          // xor the alpha values (addition under GF(256))
          const raExpVal = aExpVal ^ aExpVal2
          // swap the alpha value back to an alpha exponent
          const raExp = GF256IntToAlpha[raExpVal]
          stg[j] = raExp
          found = true
        }
      }
      if (!found) { // if the current degree wasnt found, add this term to the array
        stg.push(alphaExp, xExp)
      }
    }

    // perform a final pass on the simplified term group
    // to make sure there are no exponent terms that are greater than 255
    for (let i = 0; i < stg.length; i += 2) {
      if (stg[i] > 255) { // check alpha exponent
        const alphaExp = stg[i]
        const nExp = (alphaExp % 256) + Math.floor(alphaExp / 256)
        stg[i] = nExp
      }

      if (stg[i + 1] > 255) { // check x exponent
        const xExp = stg[i + 1]
        const nExp = (xExp % 256) + Math.floor(xExp / 256)
        stg[i + 1] = nExp
      }
    }

    return stg // pass it on up to the next term group
  }
}

export const GPToString = (terms: number[]): string => {
  let str = ''
  for (let i = 0; i < terms.length; i += 2)
    str += `α^${terms[i]}x^${terms[i + 1]} + `
  return str.slice(0, -3)
}