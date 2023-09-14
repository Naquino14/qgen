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
  if (degree == 1)
    return [0, 1, 0, 0]
  else { // otherwise
    // the current term group is (x - a^dgree) * GenGeneratorPoly(degree - 1)
    const ctg = [0, 1, degree - 1, 0] // current term group
    const ptg = GenGeneratorPoly(degree - 1) // previous term group
    // foil the current term group with the previous term group
    const rtg: number[] = [] // resulting term group
    for (let c = 0; c < ctg.length; c += 2)
      for (let p = 0; p < ptg.length; p += 2) {
        // make sure that the alpha exponent is less than 255
        let raExp = ctg[c] + ptg[p]
        if (raExp > 255)
          raExp = (raExp % 256) + Math.floor(raExp / 256)
        rtg.push(raExp, ctg[c + 1] + ptg[p + 1])
      }

    // combine like terms
    const stg: number[] = [] // simplified term group
    for (let i = 0; i < rtg.length; i += 2) {
      // get the element at the current index, and add it to the appropriate index in the simplified term group
      const alphaExp = rtg[i]
      const xExp = rtg[i + 1]
      let found = false
      // attempt to find a term of the same x degree
      for (let j = 0; j < stg.length; j += 2)
        if (stg[j + 1] == xExp) {
          // recall addition in GF(256) is just XOR
          // TODO swap with alpha value, and xor, then swap back to alpha
          // swap the alpha exponent with the alpha value
          // swap the alpha exponent of what we are adding with the alpha value
          // xor the alpha values (addition under GF(256))
          // swap the alpha value back to an alpha exponent
          stg[j] = GF256IntToAlpha[GF256AlphaToInt[stg[j]] ^ GF256AlphaToInt[alphaExp]]
          found = true
        }
      if (!found) // if the current degree wasnt found, add this term to the array
        stg.push(alphaExp, xExp)
    }

    return stg // pass it on up to the next term group
  }
}

export const GPToString = (terms: number[]): string => {
  let str = ''
  for (let i = 0; i < terms.length; i += 2)
    str += `${terms[i] == 0 ? '' : terms[i] == 1 ? 'α' : `α^${terms[i]}`}${terms[i + 1] == 0 ? '' : terms[i + 1] == 1 ? 'x' : `x^${terms[i + 1]}`} + `
  return str.slice(0, -3)
}