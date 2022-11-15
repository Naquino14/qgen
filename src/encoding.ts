import {
  ByteModulo,
  AlphanumericTable,
  ErrorCorrectionBits,
  MaskBits,
  CodewordPadding0,
  CodewordPadding1,
  BCHFormatInfoMask,
  BCHFormatInfoGeneratorPoly,
  AlphanumericTableMap,
  ByteTableMap,
} from './patterns'

export enum ErrorCorrectionLevel {
  L,
  M,
  Q,
  H,
}

export enum MaskPattern {
  M000,
  M001,
  M010,
  M011,
  M100,
  M101,
  M110,
  M111,
}

export const GenV4ByteModeHeader = (payload: string) => {
  // See 7.4.5 page 27 of ISO/IEC 18004:2015(E)
  const payloadLength = payload.length
  const alphaNumericIndicator = [false, true, false, false] // 0100
  const header: boolean[] = []
  header.push(...alphaNumericIndicator)
  const charCountIndicator = ConvertToBits(payloadLength, 11)
  header.push(...charCountIndicator)
  return header
}

export const GenTerminator = () => {
  const terminator: boolean[] = []
  terminator.push(false, false, false, false, false, false, false, false, false)
  return terminator
}

export const GenFormatInformation = (
  errorCorrectionLevel: ErrorCorrectionLevel,
  maskingPattern: MaskPattern,
): boolean[] => {
  // TODO: finish this
  const formatInformation: boolean[] = []
  formatInformation.push(...ErrorCorrectionBits(errorCorrectionLevel))
  formatInformation.push(...MaskBits(maskingPattern))

  // Calculate the error correction bits using Bose-Chaudhuri-Hocquenghem (15,5)
  // idfk what that means so fingers crossed
  // see page 87 of ISO/IEC 18004:2015(E)

  // TODO: Learn polynomial long division
  // pad formatinformation with 10 bits
  const unpaddedFormatInformation = [...formatInformation]
  formatInformation.push(...new Array<boolean>(10).fill(false))
  // remove the bits to the left:
  const firstTrue = formatInformation.indexOf(true)
  if (firstTrue !== 0) formatInformation.splice(0, firstTrue)

  const errorCorrectionBits = RecusrsiveGenFormatErrorCorrection(formatInformation)
  unpaddedFormatInformation.push(...errorCorrectionBits)
  // clear formatInformation
  formatInformation.splice(0, formatInformation.length)
  formatInformation.push(...unpaddedFormatInformation)

  // xor the error correction bits with the format information
  for (let i = 0; i < formatInformation.length; i++)
    formatInformation[i] = XOR(formatInformation[i], BCHFormatInfoMask[i])
  return formatInformation
}

export const RecusrsiveGenFormatErrorCorrection = (incomingFormatInfo: boolean[]): boolean[] => {
  // the artical says that this is Reed-Solomon but the ISO standard says its BCH? Interesting...
  const formatInfo: boolean[] = []
  incomingFormatInfo.forEach((e) => formatInfo.push(e))
  if (formatInfo.length <= 10) {
    // base case: the resulting format information error codewords is <= 10 bits long (padded to 10 bits inserting to the left)
    LeftPadArray(formatInfo, 10)
    return formatInfo
  } else {
    // recursive case: we are larger than 10 bits long.
    // delete all 0 bits to the left of the format information
    // pad 0 bits to the right of the generator polynomial to match with the size of the format information
    // and xor with the generator polynomial then recurse

    // pad the generator polynomial:
    const currentGenerator: boolean[] = []
    BCHFormatInfoGeneratorPoly.forEach((e) => currentGenerator.push(e))
    if (currentGenerator.length < formatInfo.length)
      RightPadArray(currentGenerator, formatInfo.length - currentGenerator.length) // potential point of error, I didnt write this method

    // xor the current bits with the padded generator polynomial
    for (let i = 0; i < formatInfo.length; i++) formatInfo[i] = XOR(formatInfo[i], currentGenerator[i])

    // removing the bits to the left:
    const firstTrue = formatInfo.indexOf(true)
    if (firstTrue !== 0) formatInfo.splice(0, firstTrue)
    return RecusrsiveGenFormatErrorCorrection(formatInfo) // lmfao i never called this before 💀💀💀💀💀
  }
}

export const GenV4Payload = (payload: string /*, headerFunction: (payload: string) => boolean[]*/) => {
  payload = payload.toUpperCase()
  const payloadLength = payload.length
  const payloadBits: boolean[] = []

  // generate and add header
  // const header = headerFunction(payload)
  // payloadBits.push(...header)
  const header = GenV4ByteModeHeader(payload)
  payloadBits.push(...header)

  // step 1: convert payload to char codes
  // TODO: im not sure what this is supposed to do, recheck code
  const charCodes: number[] = []
  for (let i = 0; i < payloadLength; i++) {
    const charCode = ByteTableMap.get(payload[i])
    if (charCode === undefined) throw new Error(`Invalid character in payload: ${payload[i]}`)
    charCodes.push(charCode)
  }

  // step 2: group char codes into groups of 2
  const charCodeGroups: number[][] = []
  for (let i = 0; i < payloadLength; i += 2) {
    const group: number[] = []
    group.push(charCodes[i])
    if (i + 1 < payloadLength) group.push(charCodes[i + 1])
    charCodeGroups.push(group)
  }

  // step 3: convert char codes to bits (11 bits per group) and push to payload bits
  for (const group of charCodeGroups) {
    if (group.length === 1) payloadBits.push(...ConvertToBits(group[0], 6))
    else payloadBits.push(...ConvertToBits(group[0] * 45 + group[1], 11))
  }

  // step 4: add terminator
  payloadBits.push(...GenTerminator())

  return payloadBits
}

export const BitpayloadToCodewords = (payload: boolean[]) => {
  // split payload into codewords
  const codewords: boolean[][] = []
  // loop over the payloads
  let i = 0,
    c = 0
  while (i < payload.length) {
    codewords[c] ??= []
    codewords[c].push(payload[i] ?? false)
    if (codewords[c].length === 8) c++
    i++
  }

  // pad final codeword if needed
  if (codewords[c].length < 8) {
    const pad = 8 - codewords[c].length
    const padArray = new Array(pad).fill(false)
    codewords[c].push(...padArray)
  }
  return codewords
}

const BytewiseModulus = (codeword: boolean[]) => {
  const r: boolean[] = []
  r.fill(false, 8)
  for (let i = 0; i < codeword.length; i++) r[i] = XOR(codeword[i], ByteModulo[i])
}

export const SplitDataCodewordsV4Q = (codewords: boolean[][]) => {
  // ok so bascally
  // v4 has 100 codewords total
  // as of right now, the placeholder URL has 48 codewords (see index)
  // which leaves us with 52 codewords to fill (perfect for level Q error correction)
  // that means we have 2 error correction blocks
  // that gives us a (c, k, r) of (50, 24, 13)
  // where (per block) c is the total codewords,
  // k is the number of data codewords,
  // and r is the error correction capacity (number of erasures?)
  // so we have 24 data codewords per block
  // and 26 error correction codewords per block

  const dataBlocks: boolean[][][] = []
  dataBlocks[0] = []
  dataBlocks[1] = []
  dataBlocks[0].push(...codewords.slice(0, 24))
  dataBlocks[1].push(...codewords.slice(24, 48))

  // pad missing codewords
  const r0remaining = 24 - dataBlocks[0].length
  const r1remaining = 24 - dataBlocks[1].length

  for (let i = 0; i < r0remaining; i++) dataBlocks[0].push(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1)
  for (let i = 0; i < r1remaining; i++) dataBlocks[1].push(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1)

  return dataBlocks
}

export const XOR = (a: boolean, b: boolean) => {
  return (a || b) && !(a && b)
}

const ConvertToBits = (value: number, length: number) => {
  const bits: boolean[] = []
  for (let i = 0; i < length; i++) bits.push((value >> i) % 2 === 1)
  return bits
}

const LeftPadArray = (array: boolean[], endSize: number) => {
  const padArray = new Array(endSize - array.length).fill(false)
  array.unshift(...padArray)
}

const RightPadArray = (array: boolean[], toAdd: number) => {
  const padArray = new Array(toAdd).fill(false)
  array.push(...padArray)
}
