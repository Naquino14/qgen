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
  // todo: add the rest of the header
}

export const GenTerminator = () => {
  const terminator: boolean[] = []
  terminator.push(false, false, false, false, false, false, false, false, false)
  return terminator
}
