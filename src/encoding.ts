export const GenV10ECIheader = (payload: string) => {
  const payloadLength = payload.length
  const alphaNumericECI = [false, false, true, false]
  const header: boolean[] = []
  header.push(...alphaNumericECI)
}

export const GenV4ECIheader = (payload: string) => {
  const payloadLength = payload.length
  const alphaNumericECI = [false, false, true, false]
  const header: boolean[] = []
  header.push(...alphaNumericECI)
  const charCountIndicator = ConvertToBits(payloadLength, 11)
  header.push(...charCountIndicator)
  return header
}

export const GenTerminator = () => {
  const terminator: boolean[] = []
  terminator.push(false, false, false, false, false, false, false, false, false)
  return terminator
}

export const GenPayload = (payload: string, headerFunction: (payload: string) => boolean[]) => {
  payload = payload.toUpperCase()
  const payloadLength = payload.length
  const payloadBits: boolean[] = []

  // generate and add header
  const header = headerFunction(payload)
  payloadBits.push(...header)

  // step 1: convert payload to char codes
  const charCodes: number[] = []
  for (let i = 0; i < payloadLength; i++)
    charCodes.push(AlphanumericTable.indexOf(payload[i]))

  // step 2: group char codes into groups of 2
  const charCodeGroups: number[][] = []
  for (let i = 0; i < payloadLength; i += 2) {
    const group: number[] = []
    group.push(charCodes[i])
    if (i + 1 < payloadLength) group.push(charCodes[i + 1])
    charCodeGroups.push(group)
  }
  console.log('char code groups', charCodeGroups)

  // step 3: convert char codes to bits (11 bits per group) and push to payload bits
  for (let i = 0; i < charCodeGroups.length; i++) {
    const group = charCodeGroups[i]
    if (group.length === 1)
      payloadBits.push(...ConvertToBits(group[0], 6))
    else
      payloadBits.push(...ConvertToBits(group[0] * 45 + group[1], 11))
  }

  return payloadBits
}

const ConvertToBits = (value: number, length: number) => {
  const bits: boolean[] = []
  for (let i = 0; i < length; i++)
    bits.push((value >> i) % 2 === 1)
  return bits
}

const AlphanumericTable = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', ' ', '$', '%', '*',
  '+', '-', '.', '/', ':'
]
