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