import React from 'react'

type Props = {
  width: number
  height: number
  style?: React.CSSProperties
}

export const index: React.FC = () => {
  return <div>index</div>
}

export type qsquare = {
  x: number
  y: number
  a: boolean
}

export const CheckerBoard: React.FC<Props> = ({ width, height, style }) => {
  const squares: qsquare[][] = [
    [
      { x: 0, y: 0, a: false },
      { x: 10, y: 0, a: true },
    ],
    [
      { x: 0, y: 10, a: true },
      { x: 10, y: 10, a: false },
    ],
  ]
  return (
    <div>
      <svg width={width} height={height} style={style}>
        {squares.map((row, x) => {
          row.map((square, y) => {
            return <rect x={square.x} y={square.y} width={10} height={10} fill={square.a ? 'black' : 'white'} />
          })
        })}
      </svg>
    </div>
  )
}
