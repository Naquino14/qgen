import React from 'react'
import { FinderPattern, AlignmentPattern } from './patterns'

type Props = {
  width?: number | null
  height?: number | null
  squareLength: number
  payload: string
  style?: React.CSSProperties
  squares: boolean[][]
  falseColor?: string | null
  trueColor?: string | null
}

export const i: React.FC = () => {
  return <div>index</div>
}

export const StampCode = (base: boolean[][], stamp: boolean[][], x: number = 0, y: number = 0) => {
  const result: boolean[][] = base
  for (let i = 0; i < stamp.length; i++) {
    for (let j = 0; j < stamp[i].length; j++) {
      result[i + y][j + x] = stamp[i][j]
    }
  }
  return result
}

export const QrRenderer: React.FC<Props> = ({
  width = null,
  height = null,
  squareLength,
  payload,
  style,
  falseColor = null,
  trueColor = null,
}) => {
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

  return (
    <div>
      <svg width={width ?? 57 * squareLength} height={height ?? 57 * squareLength} style={style}>
        {qr.map((row, x) =>
          row.map((square, y) => (
            <rect
              key={`${x}-${y}`}
              x={y * squareLength}
              y={x * squareLength}
              width={10}
              height={10}
              fill={square ? trueColor ?? 'black' : falseColor ?? 'white'}
            />
          )),
        )}
      </svg>
    </div>
  )
}
