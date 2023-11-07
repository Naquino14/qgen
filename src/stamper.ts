import { version } from 'react'
import { GetFinderPatternLocations } from './ecct'
import { ErrorCorrectionLevel, GenFormatInformation, MaskPattern, XOR } from './encoding'
import { AlignmentPattern, FinderPattern, HorizontalSeparator, VerticalSeparator } from './patterns'

export const Stamp = (payload: boolean[], version: number): boolean[][] => {
  console.log(version)
  // 1: create base
  const base: boolean[][] = []
  const reserved: boolean[][] = []
  const size = ((version - 1) * 4) + 21

  for (let i = 0; i < size; i++) {
    base[i] = new Array(size).fill(false)
    reserved[i] = new Array(size).fill(false)
  }

  // 2: stamp finder patterns
  // first one is in the top left corner
  StampCodeNew(base, reserved, FinderPattern, 0, 0)
  // second one is in the top right corner
  StampCodeNew(base, reserved, FinderPattern, size - 7, 0)
  // third one is on the bottom left corner
  StampCodeNew(base, reserved, FinderPattern, 0, size - 7)

  // 3: add separators
  // top left
  StampCodeNew(base, reserved, VerticalSeparator, 0, 7)
  StampCodeNew(base, reserved, HorizontalSeparator, 7, 0)
  // top right
  StampCodeNew(base, reserved, VerticalSeparator, size - 8, 7)
  StampCodeNew(base, reserved, HorizontalSeparator, 7, size - 8)
  // bottom left
  StampCodeNew(base, reserved, VerticalSeparator, 0, size - 8)
  StampCodeNew(base, reserved, HorizontalSeparator, size - 8, 0)

  // step 4: stamp alignment patterns
  // step 4.1: find the coordinates of all alignment patterns
  const apLocations = GetFinderPatternLocations(version)
  // step 4.2: stamp all the alignment patterns
  for (let i = 0; i < apLocations.length; i++)
    for (let j = 0; j < apLocations.length; j++)
      StampOverlapCheck(base, reserved, AlignmentPattern, apLocations[i] - 2, apLocations[j] - 2)

  // step 5: stamp timing patterns
  for (let i = 7; i < size - 7; i++) {
    base[i][6] = i % 2 === 0
    reserved[6][i] = true
    base[6][i] = i % 2 === 0
    reserved[i][6] = true
  }

  // 5.1: make skip zones to send to the snake function later
  // make a copy of the reserved areas and xor with everything but alignment 
  // and timing and bottom left vertical separator.
  // ### WARNING ### This is a potential source of error: Im not sure if the top left vertical separator 
  // is supposed to be reserved
  const skipZones: boolean[][] = []
  for (let i = 0; i < size; i++) {
    skipZones[i] = new Array(size).fill(false)
    for (let j = 0; j < size; j++)
      skipZones[i][j] = reserved[i][j]
  }

  // xor with everything but alignment and timing and bottom left vertical separator
  // erase the alignment patterns
  // erase bottom left alignment pattern
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 7; c++)
      skipZones[size - 8 + r][c] = false
  // set bar to the right of the bottom left alignment pattern to true (format info)
  for (let r = 0; r < 8; r++)
    skipZones[size - 8 + r][8] = true
  // erase top left finder pattern, separator, and format info
  // ### WARNING ### this is the exact point of possible error as mentioned above
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      skipZones[r][c] = false
  // erase top right finder pattern, separator, and format info
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 8; c++)
      skipZones[r][size - 8 + c] = false
  // reserve rop right format info as a skip zone
  if (version >= 7)
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 3; c++)
        skipZones[r][size - 11 + c] = true

  // 5.2 create a copy of the base to make boundaries to send to the snake function later
  // create a copy of the base
  const boundaryZones: boolean[][] = []
  // populate boundaries with all false
  for (let i = 0; i < base.length; i++)
    boundaryZones[i] = new Array(base.length).fill(false)
  // populate boundaries with horizontal separators
  for (let i = 0; i < 9; i++) {
    // top left
    boundaryZones[8][i] = true
    // bottom left
    if (i <= 6)
      boundaryZones[base.length - 8][i] = true
    // top right
    if (i <= 8)
      boundaryZones[8][base.length - 9 + i] = true
  }
  // add bottom left format info if applicable
  if (version >= 7)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++)
        boundaryZones[base.length - 11 + r][c] = true

  // step 6: Reserve format info area
  // 6.1 reserve funny module
  reserved[4 * version + 9][8] = true
  // 6.2 format info area
  // top left corner
  for (let i = 0; i < 9; i++) {
    reserved[i][8] = true
    reserved[8][i] = true
  }
  // bottom left corner
  for (let i = 0; i < 7; i++) {
    reserved[size - 7 + i][8] = true
    // top right corner
    reserved[8][size - 8 + i] = true
  }
  reserved[8][size - 1] = true


  // step 7: Reserve version info area (if applicable)
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        reserved[size - 11 + j][i] = true
        reserved[i][size - 11 + j] = true
      }
  }

  // step 8: place payload
  // start on the bottom right, and start snaking upwards
  // snake up until you hit a reserved area, then snake left

  // PlaySnake(base, payload, skipZones)

  // return reserved
  return base
  // return skipZones
  // return boundaries
}

/**
 * Snake and stamp the bit payload onto the base
 * ### WARNING ### Potential point of failure:
 *     NOTE FOR FUTURE DEBUGGING: Endianness might be f***** up here
 * @param base the qr code matrix
 * @param payload the payload to stamp
 * @param skipZones the reserved areas to skip
 */
export const PlaySnake = (base: boolean[][], payload: boolean[], skipZones: boolean[][], boundaryZones: boolean[][]) => {
  // the idea I came up with is basically looping over every codeword, and stamping when available
  // for this we need 2 masks: boundaries (OOB, vertical separators) 
  //    and reserved areas (finder patterns, vertical bar of version info on bottom left, timing patterns)
  // We need a few variables to keep track of what the heck to do next: 
  //    basically we have a cursor (x, y), a direction (left, upright, downright), and a snake direction (up true, down false)
  //    we also have a codeword bit pointer, which is just a number (unless endianness is messed up, thats gonna be fun to fix)
  // snake direction is used to determine whether we are going to turn downright or upright
  // direction is used to determine where we are going to go next
  // cursor is where we are obviously
  // the basic order of execution is as follows:
  // loop until we run out of payload (while loop)
  //     check(): can we stamp here?
  //     no:
  //         why? switch (reason):
  //             boundary: 
  //                 snake direction = !snake direction
  //                 move back to to where we came from, turn left, and go left
  //                 continue
  //             reserved area:
  //                 is vertical timing pattern:
  //                     move left
  //                     continue
  //                 otherwise: 
  //                     move normally (we will check if we can stamp there next iteration)
  //                     change direction normally
  //                     continue
  //     yes:
  //         stamp and increment codeword bit pointer
  //         move normally
  //         change direction normally

  // got it? cool lets go

  // initialize variables
  let cursor = { x: 0, y: 0 }
  let cwptr = 0
  enum Direction { left, upright, downright }
  let direction = Direction.left
  enum SnakeDirection { up = 0, down = 1 }
  let snakeDirection = SnakeDirection.up

  // create masks
  // 1: boundaries
  // boundaries are any vertical separator or oob
  // oob will be handled by a check function

  // helper functions
  enum StampReason { ok, boundary, reserved }
  const CanStamp = (): StampReason => {
    return StampReason.ok // nyi
  }

  // loop until we run out of payload
  while (cwptr < payload.length) {
    // can we stamp here?

  }
}

export const isVerticalTimingPattern = (x: number, y: number, size: number): boolean => {
  return x === 6 && y >= 7 && y <= size - 8
}

/**
 * Like stamp, except it doesnt modify the base if the stamp overlaps with a reserved area
 * @param base the base to stamp on
 * @param reserved the reserved areas
 * @param stamp the stamp to stamp  
 * @param x the x offset 
 * @param y the y offset
 */
export const StampOverlapCheck = (base: boolean[][], reserved: boolean[][], stamp: boolean[][], x: number = 0, y: number = 0): boolean => {
  const result: boolean[][] = base
  const reservedResult: boolean[][] = reserved
  // check the entire stamp if it overlaps
  for (let i = 0; i < stamp.length; i++)
    for (let j = 0; j < stamp[i].length; j++)
      if (reservedResult[i + y][j + x])
        return false // if it overlaps, return false
  // if it doesnt overlap, stamp it
  StampCodeNew(result, reservedResult, stamp, x, y)
  return true
}

/**
 *  Stamp a stamp on a base. Use this for reserved areas
 * @param base  The base to stamp on
 * @param reserved The reserved areas
 * @param stamp  The stamp to stamp
 * @param x x offset
 * @param y y offset
 * @returns 
 */
export const StampCodeNew = (base: boolean[][], reserved: boolean[][], stamp: boolean[][], x: number = 0, y: number = 0) => {
  const result: boolean[][] = base
  const reservedResult: boolean[][] = reserved
  for (let i = 0; i < stamp.length; i++) {
    for (let j = 0; j < stamp[i].length; j++) {
      result[i + y][j + x] = stamp[i][j]
      reservedResult[i + y][j + x] = true
    }
  }
}

/**
 *  Stamp a stamp on a base. Use this for reserved areas
 * @param base  The base to stamp on
 * @param stamp  The stamp to stamp
 * @param x x offset
 * @param y y offset
 * @returns 
 */
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
  for (let i = 0; i < n; i++) finalStamp[i] = new Array(n).fill(false)

  // place all the bits in the first placement
  for (let i = 0; i < 6; i++) finalStamp[8][i] = formatInfo[i]
  finalStamp[8][7] = formatInfo[6]
  finalStamp[8][8] = formatInfo[7]

  finalStamp[7][8] = formatInfo[8]
  for (let i = 5; i >= 0; i--) finalStamp[i][8] = formatInfo[14 - i]

  // place all the bits in the second placement
  for (let i = 0; i < 7; i++) finalStamp[n - 1 - i][8] = formatInfo[i]
  finalStamp[n - 8][8] = true

  for (let i = 0; i < 8; i++) finalStamp[8][n - 8 + i] = formatInfo[i + 7]

  // stamp the format information on the base

  StampXOR(base, finalStamp)
}

export const Stampv4 = (payload: string, errorCorrectionLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.L) => {

  let qr: boolean[][] = []

  // TODO: make this work for all versions
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

  // TODO: mask pattern ranking
  const maskPattern = MaskPattern.M000

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
