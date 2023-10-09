import { ErrorCorrectionInfo } from "./ecct"

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

// All this does is leaves alpha values in the array, and removes the x values
export const CleanGeneratorPoly = (poly: number[]): number[] => {
  const clean: number[] = []
  for (let i = 0; i < poly.length; i += 2)
    clean.push(poly[i])
  return clean
}

export const AlphaPolyToString = (terms: number[]): string => {
  let str = ''
  const len = terms.length - 1
  for (let i = 0; i < terms.length; i++)
    str += `α^${terms[i]}${`x^${len - i} + `}`
  return str.slice(0, -3)
}

export const BlockToPoly = (block: boolean[][]): number[] => {
  const poly: number[] = []
  // loop over all codewords in the block
  for (let i = 0; i < block.length; i++) {
    // convert boolean array to number
    let val = 0
    for (let j = 0; j < block[i].length; j++)
      val += block[i][j] ? Math.pow(2, j) : 0
    poly.push(val)
  }
  return poly
}

export const PolyToString = (poly: number[]): string => {
  let str = ''
  for (let i = 0; i < poly.length; i++)
    str += `${poly[i] == 0 ? '' : `${poly[i]}x^${poly.length - i}`} + `
  return str.slice(0, -3)
}

export const PolyToAlphaPoly = (poly: number[]): number[] => {
  const alphaPoly: number[] = []
  for (let i = 0; i < poly.length; i++)
    alphaPoly.push(GF256IntToAlpha[poly[i]], poly.length - i - 1)
  return alphaPoly
}

// Note: This is a per-block operation
export const PolyLongDivision = (eccInfo: ErrorCorrectionInfo, dataPoly: number[], generatorPoly: number[]): number[] => {
  // VERY IMPORTANT: the generator poly is ALPHA VALUES
  // and the data poly are NOT ALPHA VALUES
  const previousGenPoly: number[] = []
  const numSteps = dataPoly.length
  const genPolyBaseLen = generatorPoly.length

  // multiply the message polynomial by x^numEccCodewords
  // do this by adding numEccCodewords zeroes to the end of the message polynomial
  for (let i = 0; i < eccInfo.numErrorCorrectionCodewords; i++)
    dataPoly.push(0)
  const sizeDiff = dataPoly.length - generatorPoly.length
  for (let i = 0; i < sizeDiff; i++)
    generatorPoly.push(0)

  // initialize the previous generator polynomial
  for (let i = 0; i < dataPoly.length; i++)
    previousGenPoly.push(0)

  // multiply the generator poly by the leading coefficient of the data poly
  // get the first coefficient alpha value
  const alpha0 = GF256IntToAlpha[dataPoly[0]]
  // multiply the first term by adding the alpha exponent to the generator poly
  // mod 255
  // alsp convert the alpha poly to a normal poly
  for (let j = 0; j < genPolyBaseLen; j++)
    previousGenPoly[j] = GF256AlphaToInt[(generatorPoly[j] + alpha0) % 255] // not alpha
  // discard generator polynomial leading zero
  // xor with the message polynomial
  for (let j = 0; j < numSteps; j++) // numsteps is also the base len of the data poly
    previousGenPoly[j] ^= dataPoly[j]
  previousGenPoly.splice(0, 1)

  // loop over all the steps, minus the first
  for (let i = 1; i < numSteps - 1; i++) {
    // copy the previous generator polynomial to the next one
    const nextGenPoly: number[] = []
    for (let i = 0; i < previousGenPoly.length; i++)
      nextGenPoly.push(previousGenPoly[i])

    // get the lead term of the previous generator polynomial xor
    const alpha = GF256IntToAlpha[previousGenPoly[0]]
    for (let j = 0; j < genPolyBaseLen; j++)
      nextGenPoly[j] = GF256AlphaToInt[(generatorPoly[j] + alpha) % 255] // not alpha
    // discard generator polynomial leading zero
    // xor with the previous generator polynomial
    for (let j = 0; j < numSteps; j++) // numsteps is also the base len of the data poly
      nextGenPoly[j] ^= previousGenPoly[j]
    nextGenPoly.splice(0, 1)
    // copy the next generator polynomial to the previous one
    previousGenPoly.forEach((e, i) => previousGenPoly[i] = nextGenPoly[i])
  }

  return previousGenPoly // TODO
}