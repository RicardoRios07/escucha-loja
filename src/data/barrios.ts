/**
 * Catálogo oficial de barrios urbanos (63) y cabeceras parroquiales (14).
 * Generado por scripts/build-parroquias.mjs desde el SIL municipal (GeoServer WFS).
 * NO editar a mano: regenerar con `npm run data:territorio`.
 */

export interface Barrio {
  id: string
  nombre: string
  parroquiaId: string
  poblacion: number | null
  densidad: number | null
  /** [lat, lng] centroide del polígono oficial. */
  centro: [number, number]
  bbox: { w: number; s: number; e: number; n: number }
}

export interface Cabecera {
  id: string
  nombre: string
  parroquiaId: string
  categoria: string
  descripcion: string
  centro: [number, number]
  bbox: { w: number; s: number; e: number; n: number }
}

export const BARRIOS: Barrio[] = [
  {
    "id": "el-sagrario--18-de-noviembre",
    "nombre": "18 de Noviembre",
    "parroquiaId": "el-sagrario",
    "poblacion": 1433,
    "densidad": 97.29,
    "centro": [
      -3.997814,
      -79.203638
    ],
    "bbox": {
      "w": -79.205393,
      "s": -4.000457,
      "e": -79.20284,
      "n": -3.994256
    }
  },
  {
    "id": "el-sagrario--24-de-mayo",
    "nombre": "24 de Mayo",
    "parroquiaId": "el-sagrario",
    "poblacion": 3476,
    "densidad": 130.19,
    "centro": [
      -3.999634,
      -79.196801
    ],
    "bbox": {
      "w": -79.199286,
      "s": -4.003524,
      "e": -79.194314,
      "n": -3.994489
    }
  },
  {
    "id": "sucre--alborada",
    "nombre": "Alborada",
    "parroquiaId": "sucre",
    "poblacion": 2692,
    "densidad": 16.68,
    "centro": [
      -3.988448,
      -79.219154
    ],
    "bbox": {
      "w": -79.226425,
      "s": -3.998688,
      "e": -79.2121,
      "n": -3.984252
    }
  },
  {
    "id": "el-valle--amable-maria",
    "nombre": "Amable María",
    "parroquiaId": "el-valle",
    "poblacion": 1406,
    "densidad": 4.15,
    "centro": [
      -3.945448,
      -79.213691
    ],
    "bbox": {
      "w": -79.224064,
      "s": -3.96352,
      "e": -79.203314,
      "n": -3.930075
    }
  },
  {
    "id": "el-sagrario--barrio-central",
    "nombre": "Barrio Central",
    "parroquiaId": "el-sagrario",
    "poblacion": 1900,
    "densidad": 98.21,
    "centro": [
      -3.995987,
      -79.20172
    ],
    "bbox": {
      "w": -79.203269,
      "s": -3.998229,
      "e": -79.199031,
      "n": -3.993993
    }
  },
  {
    "id": "sucre--belen",
    "nombre": "Belén",
    "parroquiaId": "sucre",
    "poblacion": 2492,
    "densidad": 23.96,
    "centro": [
      -3.97512,
      -79.221333
    ],
    "bbox": {
      "w": -79.227453,
      "s": -3.979755,
      "e": -79.214983,
      "n": -3.969673
    }
  },
  {
    "id": "sucre--bolonia",
    "nombre": "Bolonia",
    "parroquiaId": "sucre",
    "poblacion": 337,
    "densidad": 2.61,
    "centro": [
      -3.996272,
      -79.236672
    ],
    "bbox": {
      "w": -79.246353,
      "s": -4.002453,
      "e": -79.226302,
      "n": -3.990511
    }
  },
  {
    "id": "sucre--borja",
    "nombre": "Borja",
    "parroquiaId": "sucre",
    "poblacion": 2867,
    "densidad": 16.74,
    "centro": [
      -3.986151,
      -79.221372
    ],
    "bbox": {
      "w": -79.231375,
      "s": -3.993868,
      "e": -79.213198,
      "n": -3.97807
    }
  },
  {
    "id": "san-sebastian--capuli",
    "nombre": "Capulí",
    "parroquiaId": "san-sebastian",
    "poblacion": 1028,
    "densidad": 8.93,
    "centro": [
      -4.038055,
      -79.199429
    ],
    "bbox": {
      "w": -79.201746,
      "s": -4.056659,
      "e": -79.193912,
      "n": -4.02664
    }
  },
  {
    "id": "sucre--capuli-loma",
    "nombre": "Capulí Loma",
    "parroquiaId": "sucre",
    "poblacion": 899,
    "densidad": 56.57,
    "centro": [
      -4.004092,
      -79.216469
    ],
    "bbox": {
      "w": -79.218588,
      "s": -4.007375,
      "e": -79.213448,
      "n": -4.001213
    }
  },
  {
    "id": "carigan--carigan",
    "nombre": "Carigan",
    "parroquiaId": "carigan",
    "poblacion": 3214,
    "densidad": 6.15,
    "centro": [
      -3.960254,
      -79.239195
    ],
    "bbox": {
      "w": -79.260281,
      "s": -3.983151,
      "e": -79.225682,
      "n": -3.947542
    }
  },
  {
    "id": "sucre--celi-roman",
    "nombre": "Celi Román",
    "parroquiaId": "sucre",
    "poblacion": 5574,
    "densidad": 171.81,
    "centro": [
      -3.990178,
      -79.208149
    ],
    "bbox": {
      "w": -79.210175,
      "s": -3.993619,
      "e": -79.205322,
      "n": -3.986677
    }
  },
  {
    "id": "el-valle--chinguilanchi",
    "nombre": "Chinguilanchi",
    "parroquiaId": "el-valle",
    "poblacion": 2593,
    "densidad": 59.95,
    "centro": [
      -3.964835,
      -79.19814
    ],
    "bbox": {
      "w": -79.201956,
      "s": -3.968143,
      "e": -79.193995,
      "n": -3.961233
    }
  },
  {
    "id": "sucre--chonta-cruz",
    "nombre": "Chonta Cruz",
    "parroquiaId": "sucre",
    "poblacion": 1905,
    "densidad": 18.71,
    "centro": [
      -4.010745,
      -79.222698
    ],
    "bbox": {
      "w": -79.231178,
      "s": -4.019205,
      "e": -79.216093,
      "n": -4.006268
    }
  },
  {
    "id": "punzara--ciudad-alegria",
    "nombre": "Ciudad Alegría",
    "parroquiaId": "punzara",
    "poblacion": 679,
    "densidad": 16.05,
    "centro": [
      -4.032666,
      -79.207341
    ],
    "bbox": {
      "w": -79.210625,
      "s": -4.037636,
      "e": -79.203559,
      "n": -4.027456
    }
  },
  {
    "id": "sucre--clodoveo",
    "nombre": "Clodoveo",
    "parroquiaId": "sucre",
    "poblacion": 4069,
    "densidad": 115.39,
    "centro": [
      -3.98006,
      -79.211529
    ],
    "bbox": {
      "w": -79.215476,
      "s": -3.984497,
      "e": -79.20573,
      "n": -3.976838
    }
  },
  {
    "id": "punzara--colinas-lojanas",
    "nombre": "Colinas Lojanas",
    "parroquiaId": "punzara",
    "poblacion": 3846,
    "densidad": 14.46,
    "centro": [
      -4.020987,
      -79.226219
    ],
    "bbox": {
      "w": -79.237513,
      "s": -4.034138,
      "e": -79.216512,
      "n": -4.012662
    }
  },
  {
    "id": "punzara--daniel-alvarez",
    "nombre": "Daniel Álvarez",
    "parroquiaId": "punzara",
    "poblacion": 4484,
    "densidad": 95.67,
    "centro": [
      -4.014864,
      -79.212813
    ],
    "bbox": {
      "w": -79.217102,
      "s": -4.020336,
      "e": -79.208085,
      "n": -4.012282
    }
  },
  {
    "id": "sucre--el-pedestal",
    "nombre": "El Pedestal",
    "parroquiaId": "sucre",
    "poblacion": 5644,
    "densidad": 96.99,
    "centro": [
      -3.994888,
      -79.210744
    ],
    "bbox": {
      "w": -79.215702,
      "s": -3.998809,
      "e": -79.205393,
      "n": -3.990639
    }
  },
  {
    "id": "san-sebastian--el-rosal",
    "nombre": "El Rosal",
    "parroquiaId": "san-sebastian",
    "poblacion": 1250,
    "densidad": 46.45,
    "centro": [
      -4.023404,
      -79.198854
    ],
    "bbox": {
      "w": -79.200889,
      "s": -4.027972,
      "e": -79.195806,
      "n": -4.020145
    }
  },
  {
    "id": "sucre--gran-colombia",
    "nombre": "Gran Colombia",
    "parroquiaId": "sucre",
    "poblacion": 6039,
    "densidad": 102.28,
    "centro": [
      -3.982004,
      -79.203883
    ],
    "bbox": {
      "w": -79.208095,
      "s": -3.991178,
      "e": -79.202105,
      "n": -3.968879
    }
  },
  {
    "id": "punzara--heroes-del-cenepa",
    "nombre": "Héroes del Cenepa",
    "parroquiaId": "punzara",
    "poblacion": 3716,
    "densidad": 55.04,
    "centro": [
      -4.030071,
      -79.209754
    ],
    "bbox": {
      "w": -79.218277,
      "s": -4.036934,
      "e": -79.204656,
      "n": -4.027404
    }
  },
  {
    "id": "punzara--isidro-ayora",
    "nombre": "Isidro Ayora",
    "parroquiaId": "punzara",
    "poblacion": 6478,
    "densidad": 81.6,
    "centro": [
      -4.012747,
      -79.213717
    ],
    "bbox": {
      "w": -79.220046,
      "s": -4.016857,
      "e": -79.208286,
      "n": -4.007285
    }
  },
  {
    "id": "el-valle--jipiro",
    "nombre": "Jipiro",
    "parroquiaId": "el-valle",
    "poblacion": 3224,
    "densidad": 22.95,
    "centro": [
      -3.970839,
      -79.19632
    ],
    "bbox": {
      "w": -79.20524,
      "s": -3.977695,
      "e": -79.189528,
      "n": -3.962545
    }
  },
  {
    "id": "el-sagrario--juan-de-salinas",
    "nombre": "Juan de Salinas",
    "parroquiaId": "el-sagrario",
    "poblacion": 3311,
    "densidad": 145.1,
    "centro": [
      -3.990531,
      -79.203563
    ],
    "bbox": {
      "w": -79.205651,
      "s": -3.994515,
      "e": -79.199813,
      "n": -3.988605
    }
  },
  {
    "id": "punzara--juan-jose-castillo",
    "nombre": "Juan José Castillo",
    "parroquiaId": "punzara",
    "poblacion": 1817,
    "densidad": 29.2,
    "centro": [
      -4.024049,
      -79.214911
    ],
    "bbox": {
      "w": -79.217981,
      "s": -4.028944,
      "e": -79.210406,
      "n": -4.01794
    }
  },
  {
    "id": "punzara--la-argelia",
    "nombre": "La Argelia",
    "parroquiaId": "punzara",
    "poblacion": 1745,
    "densidad": 8.48,
    "centro": [
      -4.046336,
      -79.203886
    ],
    "bbox": {
      "w": -79.217037,
      "s": -4.062695,
      "e": -79.195829,
      "n": -4.032742
    }
  },
  {
    "id": "carigan--la-banda",
    "nombre": "La Banda",
    "parroquiaId": "carigan",
    "poblacion": 9337,
    "densidad": 26.09,
    "centro": [
      -3.960988,
      -79.227212
    ],
    "bbox": {
      "w": -79.240046,
      "s": -3.972731,
      "e": -79.213843,
      "n": -3.949631
    }
  },
  {
    "id": "el-valle--la-estancia",
    "nombre": "La Estancia",
    "parroquiaId": "el-valle",
    "poblacion": 1574,
    "densidad": 41.59,
    "centro": [
      -3.966401,
      -79.201992
    ],
    "bbox": {
      "w": -79.206249,
      "s": -3.970924,
      "e": -79.199242,
      "n": -3.962198
    }
  },
  {
    "id": "el-valle--la-inmaculada",
    "nombre": "La Inmaculada",
    "parroquiaId": "el-valle",
    "poblacion": 1544,
    "densidad": 54.92,
    "centro": [
      -3.964396,
      -79.209819
    ],
    "bbox": {
      "w": -79.214152,
      "s": -3.970809,
      "e": -79.202522,
      "n": -3.960259
    }
  },
  {
    "id": "el-valle--la-paz",
    "nombre": "La Paz",
    "parroquiaId": "el-valle",
    "poblacion": 1110,
    "densidad": 28.56,
    "centro": [
      -3.962803,
      -79.204726
    ],
    "bbox": {
      "w": -79.209357,
      "s": -3.967567,
      "e": -79.200047,
      "n": -3.958769
    }
  },
  {
    "id": "el-valle--las-palmas",
    "nombre": "Las Palmas",
    "parroquiaId": "el-valle",
    "poblacion": 670,
    "densidad": 37.12,
    "centro": [
      -3.987754,
      -79.202324
    ],
    "bbox": {
      "w": -79.203487,
      "s": -3.99137,
      "e": -79.19989,
      "n": -3.983059
    }
  },
  {
    "id": "sucre--los-eucaliptos",
    "nombre": "Los Eucaliptos",
    "parroquiaId": "sucre",
    "poblacion": 1492,
    "densidad": 15.56,
    "centro": [
      -3.992929,
      -79.243155
    ],
    "bbox": {
      "w": -79.251506,
      "s": -3.998931,
      "e": -79.239019,
      "n": -3.986171
    }
  },
  {
    "id": "san-sebastian--los-geraneos",
    "nombre": "Los Geraneos",
    "parroquiaId": "san-sebastian",
    "poblacion": 5727,
    "densidad": 122.44,
    "centro": [
      -4.019769,
      -79.201058
    ],
    "bbox": {
      "w": -79.204055,
      "s": -4.02705,
      "e": -79.19956,
      "n": -4.005526
    }
  },
  {
    "id": "san-sebastian--maximo-agustin-rodriguez",
    "nombre": "Máximo Agustín Rodríguez",
    "parroquiaId": "san-sebastian",
    "poblacion": 5709,
    "densidad": 184.46,
    "centro": [
      -4.002905,
      -79.202423
    ],
    "bbox": {
      "w": -79.20472,
      "s": -4.00601,
      "e": -79.198626,
      "n": -4.000107
    }
  },
  {
    "id": "sucre--menfis",
    "nombre": "Menfis",
    "parroquiaId": "sucre",
    "poblacion": 6175,
    "densidad": 16.01,
    "centro": [
      -4.006238,
      -79.232939
    ],
    "bbox": {
      "w": -79.249416,
      "s": -4.017108,
      "e": -79.213889,
      "n": -3.997317
    }
  },
  {
    "id": "sucre--miraflores",
    "nombre": "Miraflores",
    "parroquiaId": "sucre",
    "poblacion": 6094,
    "densidad": 143.09,
    "centro": [
      -3.999568,
      -79.212595
    ],
    "bbox": {
      "w": -79.215886,
      "s": -4.00331,
      "e": -79.207525,
      "n": -3.994911
    }
  },
  {
    "id": "carigan--motupe",
    "nombre": "Motupe",
    "parroquiaId": "carigan",
    "poblacion": 7254,
    "densidad": 17.29,
    "centro": [
      -3.94438,
      -79.231384
    ],
    "bbox": {
      "w": -79.244363,
      "s": -3.959458,
      "e": -79.219702,
      "n": -3.930759
    }
  },
  {
    "id": "sucre--obrapia",
    "nombre": "Obrapía",
    "parroquiaId": "sucre",
    "poblacion": 1271,
    "densidad": 14.95,
    "centro": [
      -3.998332,
      -79.230454
    ],
    "bbox": {
      "w": -79.236739,
      "s": -4.004109,
      "e": -79.220698,
      "n": -3.99302
    }
  },
  {
    "id": "el-sagrario--orillas-del-zamora",
    "nombre": "Orillas del Zamora",
    "parroquiaId": "el-sagrario",
    "poblacion": 5101,
    "densidad": 29.4,
    "centro": [
      -3.994762,
      -79.18935
    ],
    "bbox": {
      "w": -79.201488,
      "s": -4.003002,
      "e": -79.182192,
      "n": -3.988734
    }
  },
  {
    "id": "el-sagrario--perpetuo-socorro",
    "nombre": "Perpetuo Socorro",
    "parroquiaId": "el-sagrario",
    "poblacion": 2165,
    "densidad": 139.72,
    "centro": [
      -4.004691,
      -79.205813
    ],
    "bbox": {
      "w": -79.207562,
      "s": -4.006989,
      "e": -79.204055,
      "n": -4.001447
    }
  },
  {
    "id": "carigan--pitas",
    "nombre": "Pitas",
    "parroquiaId": "carigan",
    "poblacion": 6979,
    "densidad": 55,
    "centro": [
      -3.968545,
      -79.215157
    ],
    "bbox": {
      "w": -79.221043,
      "s": -3.976894,
      "e": -79.207273,
      "n": -3.961546
    }
  },
  {
    "id": "sucre--plateado",
    "nombre": "Plateado",
    "parroquiaId": "sucre",
    "poblacion": 2726,
    "densidad": 18.91,
    "centro": [
      -3.98662,
      -79.235994
    ],
    "bbox": {
      "w": -79.242705,
      "s": -3.992082,
      "e": -79.22621,
      "n": -3.975931
    }
  },
  {
    "id": "san-sebastian--pradera",
    "nombre": "Pradera",
    "parroquiaId": "san-sebastian",
    "poblacion": 4700,
    "densidad": 104.86,
    "centro": [
      -4.012396,
      -79.198125
    ],
    "bbox": {
      "w": -79.2012,
      "s": -4.017862,
      "e": -79.194223,
      "n": -4.009348
    }
  },
  {
    "id": "san-sebastian--pucara",
    "nombre": "Pucará",
    "parroquiaId": "san-sebastian",
    "poblacion": 3672,
    "densidad": 51.15,
    "centro": [
      -4.008145,
      -79.195808
    ],
    "bbox": {
      "w": -79.201546,
      "s": -4.012921,
      "e": -79.189801,
      "n": -4.003303
    }
  },
  {
    "id": "el-sagrario--ramon-pinto",
    "nombre": "Ramón Pinto",
    "parroquiaId": "el-sagrario",
    "poblacion": 4549,
    "densidad": 202.27,
    "centro": [
      -3.99682,
      -79.207303
    ],
    "bbox": {
      "w": -79.208546,
      "s": -4.00158,
      "e": -79.2046,
      "n": -3.994402
    }
  },
  {
    "id": "el-valle--san-cayetano",
    "nombre": "San Cayetano",
    "parroquiaId": "el-valle",
    "poblacion": 7535,
    "densidad": 78.99,
    "centro": [
      -3.982521,
      -79.197004
    ],
    "bbox": {
      "w": -79.20149,
      "s": -3.989353,
      "e": -79.191724,
      "n": -3.976998
    }
  },
  {
    "id": "punzara--san-isidro",
    "nombre": "San Isidro",
    "parroquiaId": "punzara",
    "poblacion": 3554,
    "densidad": 63.39,
    "centro": [
      -4.026078,
      -79.202956
    ],
    "bbox": {
      "w": -79.206112,
      "s": -4.033311,
      "e": -79.200476,
      "n": -4.019347
    }
  },
  {
    "id": "sucre--san-jose",
    "nombre": "San José",
    "parroquiaId": "sucre",
    "poblacion": 3224,
    "densidad": 85.6,
    "centro": [
      -3.981493,
      -79.206874
    ],
    "bbox": {
      "w": -79.210065,
      "s": -3.987158,
      "e": -79.204364,
      "n": -3.976924
    }
  },
  {
    "id": "el-valle--san-juan-del-valle",
    "nombre": "San Juan del Valle",
    "parroquiaId": "el-valle",
    "poblacion": 2225,
    "densidad": 109.07,
    "centro": [
      -3.980252,
      -79.201839
    ],
    "bbox": {
      "w": -79.203143,
      "s": -3.985474,
      "e": -79.199887,
      "n": -3.976325
    }
  },
  {
    "id": "punzara--san-pedro",
    "nombre": "San Pedro",
    "parroquiaId": "punzara",
    "poblacion": 11153,
    "densidad": 184.87,
    "centro": [
      -4.006529,
      -79.210465
    ],
    "bbox": {
      "w": -79.216037,
      "s": -4.009848,
      "e": -79.205332,
      "n": -4.000655
    }
  },
  {
    "id": "sucre--san-vicente",
    "nombre": "San Vicente",
    "parroquiaId": "sucre",
    "poblacion": 4529,
    "densidad": 112.88,
    "centro": [
      -3.986192,
      -79.21082
    ],
    "bbox": {
      "w": -79.213089,
      "s": -3.992432,
      "e": -79.206898,
      "n": -3.979348
    }
  },
  {
    "id": "punzara--santa-teresita",
    "nombre": "Santa Teresita",
    "parroquiaId": "punzara",
    "poblacion": 3719,
    "densidad": 56.38,
    "centro": [
      -4.017023,
      -79.207106
    ],
    "bbox": {
      "w": -79.211146,
      "s": -4.024645,
      "e": -79.204289,
      "n": -4.012269
    }
  },
  {
    "id": "el-valle--santiago-fernandez",
    "nombre": "Santiago Fernandez",
    "parroquiaId": "el-valle",
    "poblacion": 2094,
    "densidad": 27.93,
    "centro": [
      -3.988523,
      -79.193638
    ],
    "bbox": {
      "w": -79.200359,
      "s": -3.992298,
      "e": -79.186701,
      "n": -3.985118
    }
  },
  {
    "id": "el-sagrario--santo-domingo",
    "nombre": "Santo Domingo",
    "parroquiaId": "el-sagrario",
    "poblacion": 1046,
    "densidad": 99.2,
    "centro": [
      -3.999403,
      -79.202094
    ],
    "bbox": {
      "w": -79.203038,
      "s": -4.000345,
      "e": -79.198867,
      "n": -3.997935
    }
  },
  {
    "id": "carigan--sauces-norte",
    "nombre": "Sauces Norte",
    "parroquiaId": "carigan",
    "poblacion": 3810,
    "densidad": 85.53,
    "centro": [
      -3.93857,
      -79.223151
    ],
    "bbox": {
      "w": -79.226061,
      "s": -3.947473,
      "e": -79.219156,
      "n": -3.930618
    }
  },
  {
    "id": "punzara--sol-de-los-andes",
    "nombre": "Sol de los Andes",
    "parroquiaId": "punzara",
    "poblacion": 2680,
    "densidad": 55.8,
    "centro": [
      -4.028469,
      -79.211596
    ],
    "bbox": {
      "w": -79.21714,
      "s": -4.0316,
      "e": -79.204637,
      "n": -4.023773
    }
  },
  {
    "id": "punzara--tebaida",
    "nombre": "Tebaida",
    "parroquiaId": "punzara",
    "poblacion": 7886,
    "densidad": 148.66,
    "centro": [
      -4.013131,
      -79.206363
    ],
    "bbox": {
      "w": -79.208887,
      "s": -4.019412,
      "e": -79.202651,
      "n": -4.00601
    }
  },
  {
    "id": "sucre--tierras-coloradas",
    "nombre": "Tierras Coloradas",
    "parroquiaId": "sucre",
    "poblacion": 3308,
    "densidad": 55.7,
    "centro": [
      -4.016268,
      -79.23752
    ],
    "bbox": {
      "w": -79.244987,
      "s": -4.019339,
      "e": -79.233413,
      "n": -4.011067
    }
  },
  {
    "id": "sucre--turunuma",
    "nombre": "Turunuma",
    "parroquiaId": "sucre",
    "poblacion": 2462,
    "densidad": 40.2,
    "centro": [
      -3.97636,
      -79.210635
    ],
    "bbox": {
      "w": -79.215467,
      "s": -3.978792,
      "e": -79.20467,
      "n": -3.969923
    }
  },
  {
    "id": "san-sebastian--yaguarcuna",
    "nombre": "Yaguarcuna",
    "parroquiaId": "san-sebastian",
    "poblacion": 3676,
    "densidad": 118.23,
    "centro": [
      -4.019589,
      -79.198359
    ],
    "bbox": {
      "w": -79.201033,
      "s": -4.023017,
      "e": -79.195943,
      "n": -4.013741
    }
  },
  {
    "id": "carigan--zalapa",
    "nombre": "Zalapa",
    "parroquiaId": "carigan",
    "poblacion": 230,
    "densidad": 3.06,
    "centro": [
      -3.948201,
      -79.242839
    ],
    "bbox": {
      "w": -79.250393,
      "s": -3.954235,
      "e": -79.238703,
      "n": -3.944408
    }
  },
  {
    "id": "san-sebastian--zamora-huayco",
    "nombre": "Zamora Huayco",
    "parroquiaId": "san-sebastian",
    "poblacion": 5727,
    "densidad": 43.84,
    "centro": [
      -4.004691,
      -79.190758
    ],
    "bbox": {
      "w": -79.19567,
      "s": -4.011536,
      "e": -79.181315,
      "n": -3.999566
    }
  }
]

export const CABECERAS: Cabecera[] = [
  {
    "id": "gualel-cabecera",
    "nombre": "Cabecera de Gualel",
    "parroquiaId": "gualel",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.769058,
      -79.374854
    ],
    "bbox": {
      "w": -79.381453,
      "s": -3.773161,
      "e": -79.371195,
      "n": -3.765163
    }
  },
  {
    "id": "chantaco-cabecera",
    "nombre": "Cabecera de Chantaco",
    "parroquiaId": "chantaco",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.879723,
      -79.329716
    ],
    "bbox": {
      "w": -79.331753,
      "s": -3.884188,
      "e": -79.326052,
      "n": -3.875758
    }
  },
  {
    "id": "chuquiribamba-cabecera",
    "nombre": "Cabecera de Chuquiribamba",
    "parroquiaId": "chuquiribamba",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.841544,
      -79.344303
    ],
    "bbox": {
      "w": -79.348022,
      "s": -3.847444,
      "e": -79.340778,
      "n": -3.83834
    }
  },
  {
    "id": "el-cisne-cabecera",
    "nombre": "Cabecera de El Cisne",
    "parroquiaId": "el-cisne",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.850819,
      -79.424265
    ],
    "bbox": {
      "w": -79.430316,
      "s": -3.855829,
      "e": -79.41885,
      "n": -3.846541
    }
  },
  {
    "id": "jimbilla-cabecera",
    "nombre": "Cabecera de Jimbilla",
    "parroquiaId": "jimbilla",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.860201,
      -79.171479
    ],
    "bbox": {
      "w": -79.174739,
      "s": -3.862311,
      "e": -79.168806,
      "n": -3.858096
    }
  },
  {
    "id": "loja-cabecera-cantonal",
    "nombre": "Loja (cabecera cantonal)",
    "parroquiaId": "loja-urbano",
    "categoria": "Cabecera Cantonal",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.992305,
      -79.220718
    ],
    "bbox": {
      "w": -79.260281,
      "s": -4.062695,
      "e": -79.181315,
      "n": -3.930075
    }
  },
  {
    "id": "malacatos-cabecera",
    "nombre": "Cabecera de Malacatos",
    "parroquiaId": "malacatos",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -4.219716,
      -79.259376
    ],
    "bbox": {
      "w": -79.268031,
      "s": -4.226282,
      "e": -79.251177,
      "n": -4.21323
    }
  },
  {
    "id": "quinara-cabecera",
    "nombre": "Cabecera de Quinara",
    "parroquiaId": "quinara",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -4.318799,
      -79.237152
    ],
    "bbox": {
      "w": -79.242847,
      "s": -4.327607,
      "e": -79.228107,
      "n": -4.312254
    }
  },
  {
    "id": "santiago-cabecera",
    "nombre": "Cabecera de Santiago",
    "parroquiaId": "santiago",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.793181,
      -79.284787
    ],
    "bbox": {
      "w": -79.289993,
      "s": -3.798429,
      "e": -79.278832,
      "n": -3.788158
    }
  },
  {
    "id": "san-lucas-cabecera",
    "nombre": "Cabecera de San Lucas",
    "parroquiaId": "san-lucas",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.73683,
      -79.263342
    ],
    "bbox": {
      "w": -79.266523,
      "s": -3.742127,
      "e": -79.259631,
      "n": -3.729984
    }
  },
  {
    "id": "taquil-cabecera",
    "nombre": "Cabecera de Taquil",
    "parroquiaId": "taquil",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -3.890602,
      -79.288799
    ],
    "bbox": {
      "w": -79.290596,
      "s": -3.89415,
      "e": -79.287269,
      "n": -3.88757
    }
  },
  {
    "id": "yangana-cabecera",
    "nombre": "Cabecera de Yangana",
    "parroquiaId": "yangana",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -4.363863,
      -79.176462
    ],
    "bbox": {
      "w": -79.179444,
      "s": -4.367315,
      "e": -79.174123,
      "n": -4.361435
    }
  },
  {
    "id": "san-pedro-de-vilcabamba-cabecera",
    "nombre": "Cabecera de San Pedro de Vilcabamba",
    "parroquiaId": "san-pedro-de-vilcabamba",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -4.243461,
      -79.221144
    ],
    "bbox": {
      "w": -79.224729,
      "s": -4.246197,
      "e": -79.216936,
      "n": -4.236558
    }
  },
  {
    "id": "vilcabamba-cabecera",
    "nombre": "Cabecera de Vilcabamba",
    "parroquiaId": "vilcabamba",
    "categoria": "Cabecera Parroquial",
    "descripcion": "Límite Urbano",
    "centro": [
      -4.261707,
      -79.219487
    ],
    "bbox": {
      "w": -79.227875,
      "s": -4.267327,
      "e": -79.210304,
      "n": -4.250393
    }
  }
]

export const BARRIOS_POR_PARROQUIA: Record<string, Barrio[]> = BARRIOS.reduce(
  (acc, b) => {
    ;(acc[b.parroquiaId] ||= []).push(b)
    return acc
  },
  {} as Record<string, Barrio[]>,
)
