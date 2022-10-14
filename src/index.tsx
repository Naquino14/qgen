import React from 'react'
import { FinderPattern, AlignmentPattern } from './patterns'
import { PreStampV10 } from './stamper'
import { GenV10ECIheader } from './encoding'

type Props = {
  width?: number | null
  height?: number | null
  squareLength: number
  payload: string
  style?: React.CSSProperties
  falseColor?: string | null
  trueColor?: string | null
  invertColors?: boolean
}

export const i: React.FC = () => {
  return <div>index</div>
}

export const QrRenderer: React.FC<Props> = ({
  width = null,
  height = null,
  squareLength,
  payload,
  style,
  falseColor = null,
  trueColor = null,
  invertColors = null,
}) => {
  trueColor ??= 'black'
  falseColor ??= 'white'
  invertColors ??= false

  // for testing purposes, override the payload
  payload = 'http://localhost:3000/&eventid=67897654467898765&uid=1234567890&tag=0'

  // let bitstream = GenV10ECIheader(payload)

  const qr = PreStampV10()

  return (
    <div>
      <svg width={width ?? 66 * squareLength} height={height ?? 66 * squareLength} style={style}>
        {qr.map((row, x) =>
          row.map((square, y) => (
            <rect
              key={`${x}-${y}`}
              x={y * squareLength}
              y={x * squareLength}
              width={10}
              height={10}
              fill={(square || invertColors) && !(square && invertColors) ? trueColor! : falseColor!}
            />
          )),
        )}
      </svg>
    </div>
  )
}
