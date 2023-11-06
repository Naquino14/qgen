import { version } from 'react'
import { ErrorCorrectionInfo, ErrorCorrectionTable, GetCapacity, GetECCInfo, GetRemainderBits } from './ecct'
import {
  ByteModulo,
  ErrorCorrectionBits,
  MaskBits,
  CodewordPadding0,
  CodewordPadding1,
  BCHFormatInfoMask,
  BCHFormatInfoGeneratorPoly,
  AlphanumericTableMap,
  ByteTableMap,
} from './patterns'
import { CleanGeneratorPoly, GenGeneratorPoly, PolyLongDivision } from './polymath'
import { Stamp } from './stamper'

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
  Numeric,
  Alphanumeric,
  Byte,
  Kanji, // not supported
  ECI // not supported
}

export const GenerateQRCode = (payload: string, errorCorrectionLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.L): boolean[][] | null => {
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
    for (let i = 1; i <= 40; i++) {
      const capacity = GetCapacity(i, errorCorrectionLevel, mode)
      if (capacity >= payload.length) {
        version = i
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
  const encodedBits = Encode(payload, mode)
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
  const groups = GroupCodewords(codewords, eccInfo)
  // blocks are groups[g][b][c][i]

  // 5.2 generate error correction codewords for each block
  // eccBlocks[group][block][codeword]
  const eccBlocks: boolean[][][] = GenErrorCorrectionCodes(groups, eccInfo)

  // step 6: Structuring message
  // 6.1 interleave data and ecc codewords
  /// #### this needs to be tested more, but for now im gonna push it since it works with my small test case. ####
  /// #### more specifically, multi-group codewords with different block sizes per group needs to be tested.  ####
  const interleavedCodewords = InterleaveCodewords(groups, eccBlocks, eccInfo)

  // step 6.1 add remainder bits
  const remainderBits = GenRemainderBits(version)
  interleavedCodewords.push(...remainderBits)

  payloadBits.splice(0, payloadBits.length)
  payloadBits.push(...interleavedCodewords)

  // step 7: module placement
  const code = Stamp(payloadBits, version)

  return code // placeholder
}

export const GenRemainderBits = (version: number): boolean[] => {
  const bits: boolean[] = []
  const numBits = GetRemainderBits(version)
  for (let i = 0; i < numBits; i++)
    bits.push(false)
  return bits
}

/**
 * Flatten out, and interleave data and error correction codewords
 * @param groups the grouped data codewords, in binary
 * @param eccBlocks the grouped error correction codewords, in binary
 * @param eccInfo the error correction info
 * @returns the interleaved codewords as binary
 */
export const InterleaveCodewords = (groups: boolean[][][][], eccBlocks: boolean[][][], eccInfo: ErrorCorrectionInfo): boolean[] => {
  const icw: boolean[] = []

  // get number of codewords
  const codewords = Math.max(eccInfo.group1DataCodewordsPerBlock, eccInfo.group2DataCodewordsPerBlock)

  // copy codewords into a 2d array, with the first index being the integer 
  // representation of the codeword, and the second index being the block
  // example:
  // ________ c1 c2
  // block 1: 45 67 ...
  // block 2: 89 10 ...

  const codewordTable: number[][] = []
  let row = 0
  let column = 0

  // get number of groups 
  const numGroups = eccInfo.group2DataCodewordsPerBlock === 0 ? 1 : 2
  // get number of blocks per group
  let codewordsPerBlock = eccInfo.group1DataCodewordsPerBlock
  // this swaps into group 2 num blocks once group 1 is done grouping
  let groupsPerBlock = eccInfo.group1NumBlocks

  // loop through every single codeword and add it to the table, column by column
  for (let g = 0; g < numGroups; g++) {
    for (let b = 0; b < groupsPerBlock; b++) {

      for (let c = 0; c < codewordsPerBlock; c++) {
        codewordTable[row] ??= []
        codewordTable[row][column] = convertToDigit(groups[g][b][c]) // WANING: AI GENERATED AND UNTESTED, PRONE TO OOB
        column++
      }
      row++
      column = 0
    }
    // switch to group 2
    groupsPerBlock = eccInfo.group2NumBlocks
    codewordsPerBlock = eccInfo.group2DataCodewordsPerBlock
  }

  // flatten out the codeword table into a single array
  // by reading the codewords column by column
  const flattenedCodewordTable: number[] = []
  for (let c = 0; c < codewords; c++)
    for (let r = 0; r < codewordTable.length; r++)
      flattenedCodewordTable.push(codewordTable[r][c]) // WARNING: AI GENERATED AND UNTESTED

  // loop thru every single ecc and add it to its own table, column by column
  row = 0 // reset row, and column
  column = 0

  // reset groups per block
  groupsPerBlock = eccInfo.group1NumBlocks

  // set codewords per block to the number of ecc per block
  codewordsPerBlock = eccInfo.numErrorCorrectionCodewords

  const eccTable: number[][] = []

  // flatten all blocks out into a single array, and add it to the ecc table
  for (let g = 0; g < numGroups; g++) {
    for (let b = 0; b < groupsPerBlock; b++) {

      for (let c = 0; c < codewordsPerBlock; c++) {
        // we are now looping over the codewords.
        // However, due to an oversight, all of the 
        // codewords in binary are not grouped
        const codeword = eccBlocks[g][b].slice(c * 8, (c + 1) * 8)
        const codewordDigit = convertToDigit(codeword)
        eccTable[row] ??= []
        eccTable[row][column] = codewordDigit
        column++
      }
      row++
      column = 0

    }
    // switch to group 2
    groupsPerBlock = eccInfo.group2NumBlocks
  }

  // flatten out the ecc table into a single array
  // by reading the ecc codewords column by column
  const flattenedEccTable: number[] = []
  for (let c = 0; c < codewordsPerBlock; c++)
    for (let r = 0; r < eccTable.length; r++)
      flattenedEccTable.push(eccTable[r][c])

  // convert flat data table to bits and push into icw
  flattenedCodewordTable.forEach(c => icw.push(...ConvertToBitsNew(c, 8)))

  // convert flat ecc table to bits and push into icw
  flattenedEccTable.forEach(c => icw.push(...ConvertToBitsNew(c, 8)))

  return icw
}

/// result is ecc[group][block][bit], because theres 1 codeword per block
export const GenErrorCorrectionCodes = (groups: boolean[][][][], eccInfo: ErrorCorrectionInfo): boolean[][][] => {
  const ecc: boolean[][][] = []
  // get number of ecc per block
  const numEccPb = eccInfo.numErrorCorrectionCodewords
  // get number of groups 
  const numGroups = eccInfo.group2DataCodewordsPerBlock === 0 ? 1 : 2
  // get number of blocks per group
  let codewordsPerBlock = eccInfo.group1DataCodewordsPerBlock
  // this swaps into group 2 num blocks once group 1 is done grouping
  let groupsPerBlock = eccInfo.group1NumBlocks
  // generate generator polynomial
  const eccGenPoly = CleanGeneratorPoly(GenGeneratorPoly(numEccPb))

  // loop over all the groups
  for (let g = 0; g < numGroups; g++) {
    // loop over blocks
    for (let b = 0; b < groupsPerBlock; b++) {

      const dataPoly: number[] = []
      // loop over codewords, and push each one's integer representation into an array
      for (let c = 0; c < codewordsPerBlock; c++) {
        const codeword = groups[g][b][c]
        const num = convertToDigit(codeword)
        dataPoly.push(num)
      }
      // make a copy of the generator polynomial and store it in context
      // we make a copy because the generator polynomial is modified during the division
      const ctxGenPoly: number[] = []
      eccGenPoly.forEach(e => ctxGenPoly.push(e))

      // divide the message polynomial by the generator polynomial
      const remainder = PolyLongDivision(eccInfo, dataPoly, ctxGenPoly)

      // store the remainder in ecc
      ecc[g] ??= []
      ecc[g][b] = remainder.map(e => ConvertToBitsNew(e, 8)).flat()
      // Note: this might be wrong ^^^
    }
    // switch to group 2
    groupsPerBlock = eccInfo.group2NumBlocks
    codewordsPerBlock = eccInfo.group2DataCodewordsPerBlock
  }

  return ecc
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
          return [false, false, false, true] // 0001
        case Mode.Alphanumeric:
          return [false, false, true, false] // 0010
        case Mode.Byte:
          return [false, true, false, false] // 0100
        case Mode.Kanji:
          return [true, false, false, false] // 1000
        case Mode.ECI:
          return [false, true, true, true] // 0111
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

  header.push(...ConvertToBitsNew(payloadLen, cciLength))

  return header
}

export const Encode = (payload: string, mode: Mode): boolean[] => {
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
        bits.push(...ConvertToBitsNew(parseInt(g), 10))
        break
      case 2:
        bits.push(...ConvertToBitsNew(parseInt(g), 7))
        break
      case 1:
        bits.push(...ConvertToBitsNew(parseInt(g), 4))
        break
    }
  })

  return bits
}

export const EncodeAlphanumeric = (payload: string): boolean[] => {
  // TODO: something went wrong here
  const bits: boolean[] = []

  // step 1: split payload characters into groups of 2
  const groups: string[] = []
  for (let i = 0; i < payload.length; i += 2)
    groups.push(payload.charAt(i) + (payload.charAt(i + 1) ?? ''))

  // step 2: encode each group into binary
  // 2.1: convert each substring character into digits
  const digits: number[] = []
  groups.forEach(g => {
    // 2.2 multiply the first digit by 45 (if two digits exist) and add the second digit
    const digit1 = AlphanumericTableMap.get(g[0])! * (g.length === 2 ? 45 : 1)
    const digit2 = g.length === 2 ? AlphanumericTableMap.get(g[1])! : 0
    digits.push(digit1 + digit2)
  })

  // step 3, turn each digit into 11 bits. pad left with 0s
  // if there are an odd number of characters in the payload, 
  // the last character is encoded as 6 bits
  const odd = payload.length % 2 === 1
  for (let i = 0; i < digits.length; i++)
    bits.push(...ConvertToBitsNew(digits[i], odd && i === digits.length - 1 ? 6 : 11))

  return bits
}

export const EncodeByte = (payload: string): boolean[] => {
  const bits: boolean[] = []

  // convert each number to its byte value, then push its bits
  for (let i = 0; i < payload.length; i++)
    bits.push(...ConvertToBitsNew(payload.charCodeAt(i), 8))

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

/**
 * Group codewords ecc[group][block][codeword][byte]
 * @param codewords the codewords to group
 * @param eccInfo the error correction info
 * @returns the grouped codewords
 */
export const GroupCodewords = (codewords: boolean[][], eccInfo: ErrorCorrectionInfo): boolean[][][][] => {
  /// result is ecc[group][block][codeword][byte]
  const groupedData: boolean[][][][] = []
  // if group 2's codewords per block is nonzero we have a second group
  const numGroups = eccInfo.group2DataCodewordsPerBlock === 0 ? 1 : 2
  // this swaps into group 2 num blocks once group 1 is done grouping
  let groupsPerBlock = eccInfo.group1NumBlocks
  // this swaps into group 2 data codewords per block once group 1 is done grouping
  let codewordsPerBlock = eccInfo.group1DataCodewordsPerBlock

  // loop over groups
  for (let g = 0; g < numGroups; g++) {
    // loop over blocks
    for (let b = 0; b < groupsPerBlock; b++) {
      // loop over codewords
      for (let c = 0; c < codewordsPerBlock; c++) {
        // loop over bytes
        groupedData[g] ??= []
        groupedData[g][b] ??= []
        groupedData[g][b][c] ??= []
        for (let i = 0; i < 8; i++)
          groupedData[g][b][c].push(codewords[c + (b * codewordsPerBlock)][i])
      }
    }
    // switch to group 2
    groupsPerBlock = eccInfo.group2NumBlocks
    codewordsPerBlock = eccInfo.group2DataCodewordsPerBlock
  }
  return groupedData // TODO: testme
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

// the array is padded with 0s to the left
/**
 * this takes a value number and converts it to a big endian boolean array of length `length`
 * @param value the value to convert
 * @param length the length of the resulting array
 * @returns the boolean array
 */
const ConvertToBitsNew = (value: number, length: number) => {
  const bits: boolean[] = []
  for (let i = 0; i < length; i++)
    bits.push((value >> i) % 2 === 1)
  bits.reverse()
  return bits
}

/**
 * Converts a big endian boolean array to a number
 * @param bits the bits to convert
 * @returns the number
 */
const convertToDigit = (bits: boolean[]) => {
  bits.reverse()
  let digit = 0
  for (let i = 0; i < bits.length; i++)
    digit += bits[i] ? Math.pow(2, i) : 0
  return digit
}

const LeftPadArray = (array: boolean[], endSize: number) => {
  const padArray = new Array(endSize - array.length).fill(false)
  array.unshift(...padArray)
}

const RightPadArray = (array: boolean[], toAdd: number) => {
  const padArray = new Array(toAdd).fill(false)
  array.push(...padArray)
}
