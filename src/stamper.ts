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

export const PreStampV10 = () => {
  let qr: boolean[][] = []

  for (let i = 0; i < 57; i++) {
    qr[i] = new Array(57).fill(false)
  }

  // Stamp finder patterns
  qr = StampCode(qr, FinderPattern, 0, 0)
  qr = StampCode(qr, FinderPattern, 50, 0)
  qr = StampCode(qr, FinderPattern, 0, 50)

  // Stamp alignment patterns
  qr = StampCode(qr, AlignmentPattern, 26, 4)
  qr = StampCode(qr, AlignmentPattern, 4, 26)
  qr = StampCode(qr, AlignmentPattern, 26, 26)
  qr = StampCode(qr, AlignmentPattern, 48, 26)
  qr = StampCode(qr, AlignmentPattern, 26, 48)
  qr = StampCode(qr, AlignmentPattern, 48, 48)

  // Stamp timing pattern
  for (let i = 7; i < 50; i++) {
    const o = i % 2 === 0
    qr[i][6] = o
    qr[6][i] = o
  }

  // final qr code stamp
  let finalQr: boolean[][] = []
  for (let i = 0; i < 66; i++) {
    finalQr[i] = new Array(67).fill(false)
  }

  finalQr = StampCode(finalQr, qr, 4, 4)
  qr = finalQr

  return qr
}

export const PreStampV4 = () => {
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

  // final qr code stamp
  let finalQr: boolean[][] = []
  for (let i = 0; i < 41; i++) {
    finalQr[i] = new Array(41).fill(false)
  }

  finalQr = StampCode(finalQr, qr, 4, 4)
  qr = finalQr

  return qr
}
