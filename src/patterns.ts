import { ErrorCorrectionLevel, MaskPattern } from './encoding'

export const FinderPattern = [
  [true, true, true, true, true, true, true],
  [true, false, false, false, false, false, true],
  [true, false, true, true, true, false, true],
  [true, false, true, true, true, false, true],
  [true, false, true, true, true, false, true],
  [true, false, false, false, false, false, true],
  [true, true, true, true, true, true, true],
]

export const AlignmentPattern = [
  [true, true, true, true, true],
  [true, false, false, false, true],
  [true, false, true, false, true],
  [true, false, false, false, true],
  [true, true, true, true, true],
]

export const CodewordPadding0 = [true, true, true, false, true, true, false, false] // 11101100
export const CodewordPadding1 = [false, false, false, true, false, false, false, true] // 00010001

export const ByteModulo: boolean[] = [true, false, false, false, true, true, true, false, true]
// bitwise modulo is xor (% 2)

export const BCHFormatInfoMask: boolean[] = [
  true,
  false,
  true,
  false,
  true,
  false,
  false,
  false,
  false,
  false,
  true,
  false,
  false,
  true,
  false,
] // 101010000010010

export const BCHFormatInfoGeneratorPoly: boolean[] = [
  true,
  false,
  true,
  false,
  false,
  true,
  true,
  false,
  true,
  true,
  true,
] // 10100110111 BCH(15,5)

export const MaskFunction = (x: number, y: number, pattern: MaskPattern) => {
  switch (pattern) {
    case MaskPattern.M000:
      return (x + y) % 2 === 0
    case MaskPattern.M001:
      return x % 2 === 0
    case MaskPattern.M010:
      return y % 3 === 0
    case MaskPattern.M011:
      return (x + y) % 3 === 0
    case MaskPattern.M100:
      return ((((x / 2) as number) + y / 3) as number) % 2 === 0
    case MaskPattern.M101:
      return ((x * y) % 2) + ((x * y) % 3) === 0
    case MaskPattern.M110:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    case MaskPattern.M111:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  }
}

export const MaskBits = (pattern: MaskPattern) => {
  switch (pattern) {
    case MaskPattern.M000:
      return [false, false, false]
    case MaskPattern.M001:
      return [false, false, true]
    case MaskPattern.M010:
      return [false, true, false]
    case MaskPattern.M011:
      return [false, true, true]
    case MaskPattern.M100:
      return [true, false, false]
    case MaskPattern.M101:
      return [true, false, true]
    case MaskPattern.M110:
      return [true, true, false]
    case MaskPattern.M111:
      return [true, true, true]
  }
}

export const ErrorCorrectionBits = (level: ErrorCorrectionLevel) => {
  switch (level) {
    case ErrorCorrectionLevel.L:
      return [false, true]
    case ErrorCorrectionLevel.M:
      return [false, false]
    case ErrorCorrectionLevel.Q:
      return [true, true]
    case ErrorCorrectionLevel.H:
      return [true, false]
  }
}

export const AlphanumericTable = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  ' ',
  '$',
  '%',
  '*',
  '+',
  '-',
  '.',
  '/',
  ':',
]

export const AlphanumericTableMap = new Map<string, number>()
AlphanumericTable.forEach((e, i) => {
  AlphanumericTableMap.set(e, i)
})

export const ByteTable = [
  'SOH',
  'STX',
  'ETX',
  'EOT',
  'ENQ',
  'ACK',
  'BEL',
  'BS',
  'HT',
  'LF',
  'VT',
  'FF',
  'CR',
  'SO',
  'SI',
  'DLE',
  'DC1',
  'DC2',
  'DC3',
  'DC4',
  'NAK',
  'SYN',
  'ETB',
  'CAN',
  'EM',
  'SUB',
  'ESC',
  'FS',
  'GS',
  'RS',
  'US',
  ' ',
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '[',
  '\\',
  ']',
  '^',
  '_',
  '`',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z'
]

// See 7.4.5 page 27 of ISO/IEC 18004:2015(E)
export const ByteTableMap = new Map<string, number>()
ByteTable.forEach((e, i) => {
  ByteTableMap.set(e, i)
})