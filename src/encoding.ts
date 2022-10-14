export const GenV10ECIheader = (payload: string) => {
    const payloadLength = payload.length
    const alphaNumericECI = [false, false, true, false]
    const header: boolean[] = []
    header.push(...alphaNumericECI)
}