import React from 'react'
import { FinderPattern, AlignmentPattern } from './patterns'
import { PreStampV4 } from './stamper'
import { BitpayloadToCodewords, ErrorCorrectionLevel, GenV10ECIheader, GenV4ECIheader, GenV4Payload, MaskPattern } from './encoding'

const v10wh = 66
const v4wh = 44

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

  const bitstreamHeader = GenV4ECIheader(payload)
  const bitStream = GenV4Payload(payload)
  const codewords = BitpayloadToCodewords(bitStream)

  // let bitstream = GenV10ECIheader(payload)

  const qr = PreStampV4()

  return (
    // todo: this is goofy ahh with bug and small dimensions, pls fix
    <div>
      <svg width={width ?? v4wh * squareLength} height={height ?? v4wh * squareLength} style={style}>
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
