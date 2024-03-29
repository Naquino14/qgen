import { version } from "react"
import { ErrorCorrectionLevel, Mode } from "./encoding"

export interface ErrorCorrectionInfo {
    totalDataCodewords: number
    numErrorCorrectionCodewords: number
    group1NumBlocks: number
    group1DataCodewordsPerBlock: number
    group2NumBlocks: number
    group2DataCodewordsPerBlock: number
}

export const GetECCInfo = (version: number, errorCorrectionLevel: ErrorCorrectionLevel): ErrorCorrectionInfo => {
    const info = ErrorCorrectionTable[version * 4 - 4 + errorCorrectionLevel]
    return {
        totalDataCodewords: info[0],
        numErrorCorrectionCodewords: info[1],
        group1NumBlocks: info[2],
        group1DataCodewordsPerBlock: info[3],
        group2NumBlocks: info[4],
        group2DataCodewordsPerBlock: info[5]
    }
}

export const GetCapacity = (version: number, errorCorrectionLevel: ErrorCorrectionLevel, mode: Mode): number =>
    CharacterCapacitiesTable[version - 1][errorCorrectionLevel][mode]

export const GetRemainderBits = (version: number): number => RemainderBitsTable[version - 1]

export const GetFinderPatternLocations = (version: number): number[] => {
    const locations: number[] = []
    locations.push(...AlignmentPatternLocationsTable[version - 1])
    return locations
}

export const ErrorCorrectionTable: number[][] = [ // ai generated!
    [19, 7, 1, 19, 0, 0],
    [16, 10, 1, 16, 0, 0],
    [13, 13, 1, 13, 0, 0],
    [9, 17, 1, 9, 0, 0],
    [34, 10, 1, 34, 0, 0],
    [28, 16, 1, 28, 0, 0],
    [22, 22, 1, 22, 0, 0],
    [16, 28, 1, 16, 0, 0],
    [55, 15, 1, 55, 0, 0],
    [44, 26, 1, 44, 0, 0],
    [34, 18, 2, 17, 0, 0],
    [26, 22, 2, 13, 0, 0],
    [80, 20, 1, 80, 0, 0],
    [64, 18, 2, 32, 0, 0],
    [48, 26, 2, 24, 0, 0],
    [36, 16, 4, 9, 0, 0],
    [108, 26, 1, 108, 0, 0],
    [86, 24, 2, 43, 0, 0],
    [62, 18, 2, 15, 2, 16],
    [46, 22, 2, 11, 2, 12],
    [136, 18, 2, 68, 0, 0],
    [108, 16, 4, 27, 0, 0],
    [76, 24, 4, 19, 0, 0],
    [60, 28, 4, 15, 0, 0],
    [156, 20, 2, 78, 0, 0],
    [124, 18, 4, 31, 0, 0],
    [88, 18, 2, 14, 4, 15],
    [66, 26, 4, 13, 1, 14],
    [194, 24, 2, 97, 0, 0],
    [154, 22, 2, 38, 2, 39],
    [110, 22, 4, 18, 2, 19],
    [86, 26, 4, 14, 2, 15],
    [232, 30, 2, 116, 0, 0],
    [182, 22, 3, 36, 2, 37],
    [132, 20, 4, 16, 4, 17],
    [100, 24, 4, 12, 4, 13],
    [274, 18, 2, 68, 2, 69],
    [216, 26, 4, 43, 1, 44],
    [154, 24, 6, 19, 2, 20],
    [122, 28, 6, 15, 2, 16],
    [324, 20, 4, 81, 0, 0],
    [254, 30, 1, 50, 4, 51],
    [180, 28, 4, 22, 4, 23],
    [140, 24, 3, 12, 8, 13],
    [370, 24, 2, 92, 2, 93],
    [290, 22, 6, 36, 2, 37],
    [206, 26, 4, 20, 6, 21],
    [158, 28, 7, 14, 4, 15],
    [428, 26, 4, 107, 0, 0],
    [334, 22, 8, 37, 1, 38],
    [244, 24, 8, 20, 4, 21],
    [180, 22, 12, 11, 4, 12],
    [461, 30, 3, 115, 1, 116],
    [365, 24, 4, 40, 5, 41],
    [261, 20, 11, 16, 5, 17],
    [197, 24, 11, 12, 5, 13],
    [523, 22, 5, 87, 1, 88],
    [415, 24, 5, 41, 5, 42],
    [295, 30, 5, 24, 7, 25],
    [223, 24, 11, 12, 7, 13],
    [589, 24, 5, 98, 1, 99],
    [453, 28, 7, 45, 3, 46],
    [325, 24, 15, 19, 2, 20],
    [253, 30, 3, 15, 13, 16],
    [647, 28, 1, 107, 5, 108],
    [507, 28, 10, 46, 1, 47],
    [367, 28, 1, 22, 15, 23],
    [283, 28, 2, 14, 17, 15],
    [721, 30, 5, 120, 1, 121],
    [563, 26, 9, 43, 4, 44],
    [397, 28, 17, 22, 1, 23],
    [313, 28, 2, 14, 19, 15],
    [795, 28, 3, 113, 4, 114],
    [627, 26, 3, 44, 11, 45],
    [445, 26, 17, 21, 4, 22],
    [341, 26, 9, 13, 16, 14],
    [861, 28, 3, 107, 5, 108],
    [669, 26, 3, 41, 13, 42],
    [485, 30, 15, 24, 5, 25],
    [385, 28, 15, 15, 10, 16],
    [932, 28, 4, 116, 4, 117],
    [714, 26, 17, 42, 0, 0],
    [512, 28, 17, 22, 6, 23],
    [406, 30, 19, 16, 6, 17],
    [1006, 28, 2, 111, 7, 112],
    [782, 28, 17, 46, 0, 0],
    [568, 30, 7, 24, 16, 25],
    [442, 24, 34, 13, 0, 0],
    [1094, 30, 4, 121, 5, 122],
    [860, 28, 4, 47, 14, 48],
    [614, 30, 11, 24, 14, 25],
    [464, 30, 16, 15, 14, 16],
    [1174, 30, 6, 117, 4, 118],
    [914, 28, 6, 45, 14, 46],
    [664, 30, 11, 24, 16, 25],
    [514, 30, 30, 16, 2, 17],
    [1276, 26, 8, 106, 4, 107],
    [1000, 28, 8, 47, 13, 48],
    [718, 30, 7, 24, 22, 25],
    [538, 30, 22, 15, 13, 16],
    [1370, 28, 10, 114, 2, 115],
    [1062, 28, 19, 46, 4, 47],
    [754, 28, 28, 22, 6, 23],
    [596, 30, 33, 16, 4, 17],
    [1468, 30, 8, 122, 4, 123],
    [1128, 28, 22, 45, 3, 46],
    [808, 30, 8, 23, 26, 24],
    [628, 30, 12, 15, 28, 16],
    [1531, 30, 3, 117, 10, 118],
    [1193, 28, 3, 45, 23, 46],
    [871, 30, 4, 24, 31, 25],
    [661, 30, 11, 15, 31, 16],
    [1631, 30, 7, 116, 7, 117],
    [1267, 28, 21, 45, 7, 46],
    [911, 30, 1, 23, 37, 24],
    [701, 30, 19, 15, 26, 16],
    [1735, 30, 5, 115, 10, 116],
    [1373, 28, 19, 47, 10, 48],
    [985, 30, 15, 24, 25, 25],
    [745, 30, 23, 15, 25, 16],
    [1843, 30, 13, 115, 3, 116],
    [1455, 28, 2, 46, 29, 47],
    [1033, 30, 42, 24, 1, 25],
    [793, 30, 23, 15, 28, 16],
    [1955, 30, 17, 115, 0, 0],
    [1541, 28, 10, 46, 23, 47],
    [1115, 30, 10, 24, 35, 25],
    [845, 30, 19, 15, 35, 16],
    [2071, 30, 17, 115, 1, 116],
    [1631, 28, 14, 46, 21, 47],
    [1171, 30, 29, 24, 19, 25],
    [901, 30, 11, 15, 46, 16],
    [2191, 30, 13, 115, 6, 116],
    [1725, 28, 14, 46, 23, 47],
    [1231, 30, 44, 24, 7, 25],
    [961, 30, 59, 16, 1, 17],
    [2306, 30, 12, 121, 7, 122],
    [1812, 28, 12, 47, 26, 48],
    [1286, 30, 39, 24, 14, 25],
    [986, 30, 22, 15, 41, 16],
    [2434, 30, 6, 121, 14, 122],
    [1914, 28, 6, 47, 34, 48],
    [1354, 30, 46, 24, 10, 25],
    [1054, 30, 2, 15, 64, 16],
    [2566, 30, 17, 122, 4, 123],
    [1992, 28, 29, 46, 14, 47],
    [1426, 30, 49, 24, 10, 25],
    [1096, 30, 24, 15, 46, 16],
    [2702, 30, 4, 122, 18, 123],
    [2102, 28, 13, 46, 32, 47],
    [1502, 30, 48, 24, 14, 25],
    [1142, 30, 42, 15, 32, 16],
    [2812, 30, 20, 117, 4, 118],
    [2216, 28, 40, 47, 7, 48],
    [1582, 30, 43, 24, 22, 25],
    [1222, 30, 10, 15, 67, 16],
    [2956, 30, 19, 118, 6, 119],
    [2334, 28, 18, 47, 31, 48],
    [1666, 30, 34, 24, 34, 25],
    [1276, 30, 20, 15, 61, 16],
]

// starts at version 1, goes [ L[Numeric, Alphanumeric, Byte], M[Numeric, Alphanumeric, Byte], Q[Numeric, Alphanumeric, Byte], H[Numeric, Alphanumeric, Byte] ]
export const CharacterCapacitiesTable: number[][][] = [ // ai generated! starts at version 1
    [[41, 25, 17], [34, 20, 14], [27, 16, 11], [17, 10, 7]],
    [[77, 47, 32], [63, 38, 26], [48, 29, 20], [34, 20, 14]],
    [[127, 77, 53], [101, 61, 42], [77, 47, 32], [58, 35, 24]],
    [[187, 114, 78], [149, 90, 62], [111, 67, 46], [82, 50, 34]],
    [[255, 154, 106], [202, 122, 84], [144, 87, 60], [106, 64, 44]],
    [[322, 195, 134], [255, 154, 106], [178, 108, 74], [139, 84, 58]],
    [[370, 224, 154], [293, 178, 122], [207, 125, 86], [154, 93, 64]],
    [[461, 279, 192], [365, 221, 152], [259, 157, 108], [202, 122, 84]],
    [[552, 335, 230], [432, 262, 180], [312, 189, 130], [235, 143, 98]],
    [[652, 395, 271], [513, 311, 213], [364, 221, 151], [288, 174, 119]],
    [[772, 468, 321], [604, 366, 251], [427, 259, 177], [331, 200, 137]],
    [[883, 535, 367], [691, 419, 287], [489, 296, 203], [374, 227, 155]],
    [[1022, 619, 425], [796, 483, 331], [580, 352, 241], [427, 259, 177]],
    [[1101, 667, 458], [871, 528, 362], [621, 376, 258], [468, 283, 194]],
    [[1250, 758, 520], [991, 600, 412], [703, 426, 292], [530, 321, 220]],
    [[1408, 854, 586], [1082, 656, 450], [775, 470, 322], [602, 365, 250]],
    [[1548, 938, 644], [1212, 734, 504], [876, 531, 364], [674, 408, 280]],
    [[1725, 1046, 718], [1346, 816, 560], [948, 574, 394], [746, 452, 310]],
    [[1903, 1153, 792], [1500, 909, 624], [1063, 644, 442], [813, 493, 338]],
    [[2061, 1249, 858], [1600, 970, 666], [1159, 702, 482], [919, 557, 382]],
    [[2232, 1352, 929], [1708, 1035, 711], [1224, 742, 509], [969, 587, 403]],
    [[2409, 1460, 1003], [1872, 1134, 779], [1358, 823, 565], [1056, 640, 439]],
    [[2620, 1588, 1091], [2059, 1248, 857], [1468, 890, 611], [1108, 672, 461]],
    [[2812, 1704, 1171], [2188, 1326, 911], [1588, 963, 661], [1228, 744, 511]],
    [[3057, 1853, 1273], [2395, 1451, 997], [1718, 1041, 715], [1286, 779, 535]],
    [[3283, 1990, 1367], [2544, 1542, 1059], [1804, 1094, 751], [1425, 864, 593]],
    [[3517, 2132, 1465], [2701, 1637, 1125], [1933, 1172, 805], [1501, 910, 625]],
    [[3669, 2223, 1528], [2857, 1732, 1190], [2085, 1263, 868], [1581, 958, 658]],
    [[3909, 2369, 1628], [3035, 1839, 1264], [2181, 1322, 908], [1677, 1016, 698]],
    [[4158, 2520, 1732], [3289, 1994, 1370], [2358, 1429, 982], [1782, 1080, 742]],
    [[4417, 2677, 1840], [3486, 2113, 1452], [2473, 1499, 1030], [1897, 1150, 790]],
    [[4686, 2840, 1952], [3693, 2238, 1538], [2670, 1618, 1112], [2022, 1226, 842]],
    [[4965, 3009, 2068], [3909, 2369, 1628], [2805, 1700, 1168], [2157, 1307, 898]],
    [[5253, 3183, 2188], [4134, 2506, 1722], [2949, 1787, 1228], [2301, 1394, 958]],
    [[5529, 3351, 2303], [4343, 2632, 1809], [3081, 1867, 1283], [2361, 1431, 983]],
    [[5836, 3537, 2431], [4588, 2780, 1911], [3244, 1966, 1351], [2524, 1530, 1051]],
    [[6153, 3729, 2563], [4775, 2894, 1989], [3417, 2071, 1423], [2625, 1591, 1093]],
    [[6479, 3927, 2699], [5039, 3054, 2099], [3599, 2181, 1499], [2735, 1658, 1139]],
    [[6743, 4087, 2809], [5313, 3220, 2213], [3791, 2298, 1579], [2927, 1774, 1219]],
    [[7089, 4296, 2953], [5596, 3391, 2331], [3993, 2420, 1663], [3057, 1852, 1273]]
]

export const RemainderBitsTable: number[] = [
    0, 7, 7, 7, 7, 7, 0, 0,
    0, 0, 0, 0, 0, 3, 3, 3,
    3, 3, 3, 3, 4, 4, 4, 4,
    4, 4, 4, 3, 3, 3, 3, 3,
    3, 3, 0, 0, 0, 0, 0, 0
]

export const AlignmentPatternLocationsTable: number[][] = [ // based on the center module coordinate
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
]