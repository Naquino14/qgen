export type Term = {
    coeficient: number
    exponent: number
}

export const ParsePolynomial = (polynomial: string): Term[] => {
    const terms: Term[] = []
    const termRegx = /(\d+)?x?(\^-?\d+)?/g
    const coefficientRegex = /\d+/
    const matches = polynomial.match(termRegx)

    if (matches === null) return []

    for (const match of matches) {
        if (match === '')
            continue
        const coefficient = Number.parseInt(match.split('x').at(0) ? match.split('x').at(0) ?? '1' : '1')
        const temp = match.split('^').at(1)?.match(coefficientRegex)![0]
        const power = Number.parseInt(temp ?? (match.includes('x') ? '1' : '0'))
        terms.push({ coeficient: coefficient, exponent: power })
    }
    return terms
}