import { ErrorCorrectionInfo, ErrorCorrectionTable, GetCapacity, GetECCInfo } from './ecct'
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

export enum Mode {
  Byte,
  Numeric,
  Alphanumeric,
  Kanji, // not supported
  ECI // not supported
}

export const GenerateQRCode = (payload: string, errorCorrectionLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.L): boolean[][] | null => {
  const code: boolean[][] = []

  // step 1: analyze data
  const mode: Mode = (() => {
    // check if numeric
    if (/\d+/.test(payload))
      return Mode.Numeric
    // check if alphanumeric
    if (/([A-Z]|[a-z]|[\s$%*+\-./:])+/.test(payload))
      return Mode.Alphanumeric
    // check if byte
    return Mode.Byte
  })()

  // step 2: encode data into bits
  const payloadBits: boolean[] = []

  // 2.1: determine version, and get ecc info
  // if the payload is too large return undefined
  if (GetCapacity(40, errorCorrectionLevel, mode) < payload.length)
    return null
  const version = ((): number => {
    // find the smallest version that can fit the payload
    let version = 1
    for (let i = 0; i < 40; i++) {
      const capacity = GetCapacity(i, errorCorrectionLevel, mode)
      if (capacity >= payload.length) {
        version = i + 1
        break
      }
    }
    return version
  })()

  const eccInfo = GetECCInfo(version, errorCorrectionLevel)

  // step 2.2: header, contains mode indicator and character count indicator
  const header = GenHeader(payload.length, mode, version)
  payloadBits.push(...header)

  // 2.3: encode payload
  const encodedBits = Encode(payload, mode, errorCorrectionLevel)
  payloadBits.push(...encodedBits)

  // step 3 padding
  // 3.1 add a terminator
  const diff = eccInfo.totalDataCodewords * 8 - payloadBits.length
  if (diff > 4)
    payloadBits.push(...new Array<boolean>(4).fill(false))
  else
    payloadBits.push(...new Array<boolean>(diff).fill(false))

  // 3.2 make sure payload is a multiple of 8
  payloadBits.push(...new Array<boolean>(8 - (payloadBits.length % 8)).fill(false))

  // 3.3 add padding if necessary
  const padding = GenPadding(payloadBits.length, eccInfo)
  payloadBits.push(...padding)

  // step 4: split payload into codewords
  const codewords = PayloadToCodewords(payloadBits)

  // step 5: error correction coding
  // 5.1 split codewords into blocks
  const blocks = GroupCodewords(codewords, eccInfo)


  return code // placeholder
}

export const GenPadding = (payloadSize: number, eccInfo: ErrorCorrectionInfo): boolean[] => {
  const padding: boolean[] = []

  const codewordPayloadSize = payloadSize / 8
  const diff = eccInfo.totalDataCodewords - codewordPayloadSize
  // alternate between 11101100 and 00010001
  for (let i = 0; i < diff; i++)
    padding.push(...(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1))

  return padding
}

export const GenHeader = (payloadLen: number, mode: Mode, version: number): boolean[] => {
  const header: boolean[] = []
  // add mode indicator
  header.push(
    ...((): boolean[] => {
      switch (mode) {
        case Mode.Numeric:
          return [false, false, true, false] // 0001
        case Mode.Alphanumeric:
          return [false, true, false, false] // 0010
        case Mode.Byte:
          return [false, true, false, false] // 0100
        case Mode.Kanji:
          return [false, true, false, false] // 1000
        case Mode.ECI:
          return [false, true, false, false] // 0111
      }
    })()
  )

  // add character count indicator
  const cciLength = ((): number => {
    if (version <= 9)
      switch (mode) {
        case Mode.Numeric:
          return 10
        case Mode.Alphanumeric:
          return 9
        case Mode.Byte:
          return 8
      }
    else if (version <= 26)
      switch (mode) {
        case Mode.Numeric:
          return 12
        case Mode.Alphanumeric:
          return 11
        case Mode.Byte:
          return 16
      }
    else
      switch (mode) {
        case Mode.Numeric:
          return 14
        case Mode.Alphanumeric:
          return 13
        case Mode.Byte:
          return 16
      }
    throw new Error('Invalid version')
  })()

  header.push(...ConvertToBits(payloadLen, cciLength))

  return header
}

export const Encode = (payload: string, mode: Mode, ecl: ErrorCorrectionLevel): boolean[] => {
  switch (mode) {
    case Mode.Numeric:
      return EncodeNumeric(payload)
    case Mode.Alphanumeric:
      return EncodeAlphanumeric(payload)
    case Mode.Byte:
      return EncodeByte(payload)
    case Mode.Kanji:
      throw new Error('Kanji is not supported')
    case Mode.ECI:
      throw new Error('ECI is not supported')
  }
}

export const EncodeNumeric = (payload: string): boolean[] => {
  // step 1: split payload into groups of 3
  const groups: string[] = []
  for (let i = 0; i < payload.length; i += 3)
    groups.push(payload.slice(i, i + 3))

  // step 2: encode each group into binary.
  // 3 digits: 10 bits
  // 2 digits: 7 bits
  // 1 digit: 4 bits
  // note  zeroes dont count

  const bits: boolean[] = []
  groups.forEach(g => {
    switch (g.length) {
      case 3:
        bits.push(...ConvertToBits(parseInt(g), 10))
        break
      case 2:
        bits.push(...ConvertToBits(parseInt(g), 7))
        break
      case 1:
        bits.push(...ConvertToBits(parseInt(g), 4))
        break
    }
  })

  return bits
}

export const EncodeAlphanumeric = (payload: string): boolean[] => {
  const bits: boolean[] = []

  // step 1: split payload characters into groups of 2
  const groups: string[] = []
  for (let i = 0; i < payload.length; i += 2)
    groups.push(payload.charAt(i) + (payload.charAt(i + 1) ?? ''))

  // step 2: encode each group into binary
  // 2.1: convert each substring character into digits
  const digits: number[] = []
  groups.forEach(g => {
    // 2.2 multiply the first digit by 45 and add the second digit
    const digit1 = AlphanumericTableMap.get(g[0])! * 45
    const digit2 = g.length === 2 ? AlphanumericTableMap.get(g[1])! : 0
    digits.push(digit1 + digit2)
  })

  // step 3, turn each digit into 11 bits. pad left with 0s
  digits.forEach(d => bits.push(...ConvertToBits(d, 11)))

  return bits
}

export const EncodeByte = (payload: string): boolean[] => {
  const bits: boolean[] = []

  // convert each number to its byte value, then push its bits
  for (let i = 0; i < payload.length; i++)
    bits.push(...ConvertToBits(payload.charCodeAt(i), 8))

  return bits
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
  if (payloadSize % 8 === 0)
    return terminator
  terminator.push(...new Array<boolean>(payloadSize % 8).fill(false))
  return terminator
}

export const Genv4CodewordPadding = (errorCorrectionLevel: ErrorCorrectionLevel, codewordCount: number) => {
  const padding: boolean[] = []
  const remainingCodewordCapacity = QRv4DataCapacities.get(errorCorrectionLevel)! - codewordCount / 8
  if (remainingCodewordCapacity < 0)
    throw new Error('Codeword count exceeds capacity')
  for (let i = 0; i < remainingCodewordCapacity; i++)
    padding.push(...(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1)) // see 7.4.10 page 40 of ISO/IEC 18004:2015(E)
  return padding
}

export const GenFormatInformation = (
  errorCorrectionLevel: ErrorCorrectionLevel,
  maskingPattern: MaskPattern,
): boolean[] => {
  const formatInformation: boolean[] = []
  formatInformation.push(...ErrorCorrectionBits(errorCorrectionLevel))
  formatInformation.push(...MaskBits(maskingPattern))

  // Calculate the error correction bits using Bose-Chaudhuri-Hocquenghem (15,5)
  // see page 87 of ISO/IEC 18004:2015(E)

  // pad formatinformation with 10 bits
  const unpaddedFormatInformation = [...formatInformation]
  formatInformation.push(...new Array<boolean>(10).fill(false))
  // remove the bits to the left:
  const firstTrue = formatInformation.indexOf(true)
  if (firstTrue !== 0)
    formatInformation.splice(0, firstTrue)

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
      RightPadArray(currentGenerator, formatInfo.length - currentGenerator.length)

    // xor the current bits with the padded generator polynomial
    for (let i = 0; i < formatInfo.length; i++)
      formatInfo[i] = XOR(formatInfo[i], currentGenerator[i])

    // removing the bits to the left:
    const firstTrue = formatInfo.indexOf(true)
    if (firstTrue !== 0)
      formatInfo.splice(0, firstTrue)
    return RecusrsiveGenFormatErrorCorrection(formatInfo) // lmfao i never called this before 💀💀💀💀💀
  }
}


export const GenV4Payload = (payload: string, errorCorrectionLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.L) => {
  // this method works explicitely for byte mode v4
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
    if (charCode === undefined)
      throw new Error(`Invalid character in payload: ${payload[i]}`)
    charCodes.push(charCode)
  }

  // step 2: convert to bits
  charCodes.forEach((code) => payloadBits.push(...ConvertToBits(code, 8)))

  // step 3: add terminator
  payloadBits.push(...GenTerminator(payloadBits.length))

  // step 4: add padding
  payloadBits.push(...Genv4CodewordPadding(errorCorrectionLevel, payloadBits.length))

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
    if (codewords[c].length === 8)
      c++
    i++
  }
  return codewords
}

/// result is ecc[block][group][codeword]
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
    for (let g = 0; g < eccGroupSize; g++) {
      // copy codeword to its slot
      eccBlocks[b][g] = []
      codewords[g + (b * eccGroupSize)].forEach(c => eccBlocks[b][g].push(c))
    }
  }
  return eccBlocks
}

/// result is ecc[group][block][codeword][byte]
export const GroupCodewords = (codewords: boolean[][], eccInfo: ErrorCorrectionInfo): boolean[][][][] => {
  return [] // todo
}

const BytewiseModulus = (codeword: boolean[]) => {
  const r: boolean[] = []
  r.fill(false, 8)
  for (let i = 0; i < codeword.length; i++)
    r[i] = XOR(codeword[i], ByteModulo[i])
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

  for (let i = 0; i < r0remaining; i++)
    dataBlocks[0].push(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1)
  for (let i = 0; i < r1remaining; i++)
    dataBlocks[1].push(i % 2 === 0 ? CodewordPadding0 : CodewordPadding1)

  return dataBlocks
}

export const XOR = (a: boolean, b: boolean) => {
  return (a || b) && !(a && b)
}

const ConvertToBits = (value: number, length: number) => {
  const bits: boolean[] = []
  for (let i = 0; i < length; i++)
    bits.push((value >> i) % 2 === 1)
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
