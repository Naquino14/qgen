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

// see table 9 column 8 (v4) page 46 of ISO/IEC 18004:2015(E)
// or table 7 column 8 (v4) page 41 of ISO/IEC 18004:2015(E)
export const QRv4DataCapacities = new Map<ErrorCorrectionLevel, number>()
QRv4DataCapacities.set(ErrorCorrectionLevel.L, 80)
QRv4DataCapacities.set(ErrorCorrectionLevel.M, 64)
QRv4DataCapacities.set(ErrorCorrectionLevel.Q, 48)
QRv4DataCapacities.set(ErrorCorrectionLevel.H, 36)

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
  const charCountIndicator = ConvertToBits(payloadLength, 8) // ISO/IEC 18004:2015(E) page 31 table 3
  header.push(...charCountIndicator)
  return header
}

export const GenTerminator = (payloadSize: number) => {
  const terminator: boolean[] = []
  if (payloadSize % 8 === 0) return terminator
  terminator.push(...new Array<boolean>(payloadSize % 8).fill(false))
  return terminator
}

export const GenCodewordPadding = (errorCorrectionLevel: ErrorCorrectionLevel, codewordCount: number) => {
  const padding: boolean[] = []
  const remainingCodewordCapacity = QRv4DataCapacities.get(errorCorrectionLevel)! - codewordCount / 8
  if (remainingCodewordCapacity < 0) throw new Error('Codeword count exceeds capacity')
  for (let i = 0; i < remainingCodewordCapacity; i++)
    padding.push(...(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1)) // see 7.4.10 page 40 of ISO/IEC 18004:2015(E)
  return padding
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

export const GenV4Payload = (payload: string, errorCorrectionLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.L) => {
  // this method works explicitely for byte mode
  payload = payload.toUpperCase()
  const payloadLength = payload.length
  const payloadBits: boolean[] = []

  // generate and add header
  // const header = headerFunction(payload)
  // payloadBits.push(...header)
  const header = GenV4ByteModeHeader(payload)
  payloadBits.push(...header)

  // step 1: encode payload with byte mode
  const charCodes: number[] = []
  for (let i = 0; i < payloadLength; i++) {
    const charCode = ByteTableMap.get(payload[i])
    if (charCode === undefined) throw new Error(`Invalid character in payload: ${payload[i]}`)
    charCodes.push(charCode)
  }

  // step 2: convert to bits
  charCodes.forEach((code) => payloadBits.push(...ConvertToBits(code, 8)))

  // step 3: add terminator
  payloadBits.push(...GenTerminator(payloadBits.length))

  // step 4: add padding
  payloadBits.push(...GenCodewordPadding(errorCorrectionLevel, payloadBits.length))

  return payloadBits
}

export const PayloadToCodewords = (payload: boolean[]) => {
  // NOTE: the payload must be properly terminated and padded before this method is called
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
  return codewords
}

export const QRv4CodewordsToPreECCBlocks = (codewords: boolean[][], errorCorrectionLevel: ErrorCorrectionLevel) => {
  const eccBlocks: boolean[][][] = []
  // determine the block count
  const eccBlockCount = ((): number => {
    switch (errorCorrectionLevel) {
      case ErrorCorrectionLevel.L:
        return 1
      case ErrorCorrectionLevel.M:
      case ErrorCorrectionLevel.Q:
        return 2
      case ErrorCorrectionLevel.H:
        return 4
    }
  })()

  // determine the block sizes
  const eccGroupSize = ((): number => {
    switch (errorCorrectionLevel) {
      case ErrorCorrectionLevel.L:
        return 80
      case ErrorCorrectionLevel.M:
        return 32
      case ErrorCorrectionLevel.Q:
        return 24
      case ErrorCorrectionLevel.H:
        return 9
    }
  })()

  for (let b = 0; b < eccBlockCount; b++) {
    eccBlocks[b] = []
    for (let i = 0; i < eccGroupSize; i++) {
      // uhh
      // TODO
    }
  }
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
