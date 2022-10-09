import React from 'react'

type Props = {
  width: number
  height: number
  squareLength: number
  style?: React.CSSProperties
  squares: qsquare[][]
  falseColor?: string
  trueColor?: string
}

export const index: React.FC = () => {
  return <div>index</div>
}

export type qsquare = {
  a: boolean
}

export const QrRenderer: React.FC<Props> = ({
  width,
  height,
  squareLength,
  style,
  squares,
  falseColor = null,
  trueColor = null,
}) => {
  return (
    <div>
      <svg width={width} height={height} style={style}>
        {squares.map((row, x) =>
          row.map((square, y) => (
            <rect
              key={`${x}-${y}`}
              x={y * squareLength}
              y={x * squareLength}
              width={10}
              height={10}
              fill={square.a ? trueColor ?? 'black' : falseColor ?? 'white'}
            />
          )),
        )}
      </svg>
    </div>
  )
}
