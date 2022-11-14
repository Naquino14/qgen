import { ErrorCorrectionLevel, GenFormatInformation, MaskPattern, XOR, } from './encoding'
import { AlignmentPattern, FinderPattern } from './patterns'

export const StampCode = (base: boolean[][], stamp: boolean[][], x: number = 0, y: number = 0) => {
  const result: boolean[][] = base
  for (let i = 0; i < stamp.length; i++) {
    for (let j = 0; j < stamp[i].length; j++) {
      result[i + y][j + x] = stamp[i][j]
    }
  }
  return result
}

export const StampXOR = (base: boolean[][], stamp: boolean[][], x: number = 0, y: number = 0) => {
  const result: boolean[][] = base
  for (let i = 0; i < stamp.length; i++) {
    for (let j = 0; j < stamp[i].length; j++) {
      result[i + y][j + x] = XOR(result[i + y][j + x], stamp[i][j])
    }
  }
  return result
}

export const StampFormatInfo = (base: boolean[][], formatInfo: boolean[]) => {
  // ok so basically (legit writing this for copilot)
  // The format info is always 15 bits long, and should go in this specific pattern:
  // first 8 bits [0 - 7]: from (0, 8) to (8, 8), left to right and skip over (6, 8) as it is part of the timing pattern
  // next 7 bits [8 - 14]: from (8, 7) to (8, 0), bottom to top and skip over (8, 6) as it is part of the timing pattern
  // the second placement of the pattern goes as such:
  // let n be the side length of the QR code
  // first 7 bits: (8, baseLength - 1) to (8, n - 7). (8, baseLength - 8) is always black
  // next 8 bits: (baseLength - 9, 8) to (baseLength - 1, 8).

  const n = base.length
  // create a final stamp to stamp on top of the base
  const finalStamp: boolean[][] = [] // TODO: cant initialize this tf???
  for (let i = 0; i < n; i++)
    finalStamp[i] = new Array(n).fill(false)

  // place all the bits in the first placement
  for (let i = 0; i < 6; i++)
    finalStamp[8][i] = formatInfo[i]
  finalStamp[8][7] = formatInfo[6]
  finalStamp[8][8] = formatInfo[7]

  finalStamp[7][8] = formatInfo[8]
  for (let i = 5; i >= 0; i--)
    finalStamp[i][8] = formatInfo[14 - i]

  // place all the bits in the second placement
  for (let i = 0; i < 7; i++)
    finalStamp[n - 1 - i][8] = formatInfo[i]
  finalStamp[n - 8][8] = true

  for (let i = 0; i < 8; i++)
    finalStamp[8][n - 8 + i] = formatInfo[i + 7]

  // stamp the format information on the base

  StampXOR(base, finalStamp)
}

export const PreStampV4 = (
  errorCorrectionLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.M,
  maskPattern: MaskPattern = MaskPattern.M110,
) => {
  let qr: boolean[][] = []

  for (let i = 0; i < 33; i++) {
    qr[i] = new Array(33).fill(false)
  }

  // Stamp finder patterns
  qr = StampCode(qr, FinderPattern, 0, 0)
  qr = StampCode(qr, FinderPattern, 26, 0)
  qr = StampCode(qr, FinderPattern, 0, 26)

  // Stamp alignment patterns
  qr = StampCode(qr, AlignmentPattern, 24, 24)

  // Stamp timing pattern
  for (let i = 7; i < 26; i++) {
    const o = i % 2 === 0
    qr[i][6] = o
    qr[6][i] = o
  }

  // stamp format information
  const formatInfo = GenFormatInformation(errorCorrectionLevel, maskPattern)
  StampFormatInfo(qr, formatInfo)

  // final qr code stamp
  let finalQr: boolean[][] = []
  for (let i = 0; i < 41; i++) {
    finalQr[i] = new Array(41).fill(false)
  }

  finalQr = StampCode(finalQr, qr, 4, 4)
  qr = finalQr

  return qr
}
