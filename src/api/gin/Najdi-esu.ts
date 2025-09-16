import { z } from 'zod'

import type { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
  RequestParamOrder,
  RequestParamType,
} from '../../utils/request-util'
import { coercedArray } from '../../utils/validation'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=GIN&version=525&methodName=najdi-esu&type=request
const najdiEsuRequestProperties = [
  'Lic',
  'Aktivita',
  'Poznamka',
  'Datum-zmeny',
  'Zkratka',
  'Nazev',
  'Obchodni-jmeno',
  'Typ-esu',
  'Verifikace',
  'Stat',
  'Psc',
  'Obec',
  'Cast-obce',
  'Ulice',
  'Cislo-orientacni',
  'Cislo-popisne',
  'Ico',
  'Dic',
  'Telefon',
  'E-mail',
  'Fax',
  'Typ-organizace',
  'Rodne-cislo',
  'Jmeno',
  'Prijmeni',
  'Titul-pred',
  'Titul-za',
  'Esu-txt',
  'Kod-uir-adr',
  'Po-box',
  'Radek-obalky0',
  'Radek-obalky1',
  'Radek-obalky2',
  'Radek-obalky3',
  'Radek-obalky4',
  'Radek-obalky5',
  'Radek-obalky6',
  'Radek-obalky7',
  'Platce-dph',
  'Datum-zmeny-od',
  'Datum-zmeny-do',
  'Id-dat-schranky',
  'Datum-narozeni',
  'Duvod-ucel',
  'Uroven-pristupu',
  'Id-esu-hlavni',
  'Id-aktualni-verze-esu',
  'Osobni-cislo',
  'Id-eu',
] as const

export type GinNajdiEsuRequest = {
  [K in (typeof najdiEsuRequestProperties)[number] as K]?: RequestParamType
}

const rizeniPrehleduRequestProperties = ['Rozsah-prehledu']

export type GinNajdiEsuRequestRizeniPrehledu = {
  [K in (typeof rizeniPrehleduRequestProperties)[number] as K]?: RequestParamType
}

const najdiEsuParamOrders: RequestParamOrder[] = [
  {
    name: 'Najdi-esu',
    params: najdiEsuRequestProperties,
  },
  {
    name: 'Rizeni-prehledu',
    params: rizeniPrehleduRequestProperties,
  },
]

const najdiEsuSchema = z.object({
  'Id-esu': z.string(),
  'Typ-esu': z.string().optional(),
  Nazev: z.string().optional(),
  Stat: z.string().optional(),
  Psc: z.string().optional(),
  Obec: z.string().optional(),
  Ulice: z.string().optional(),
  'Cislo-orientacni': z.string().optional(),
  'Cislo-popisne': z.string().optional(),
  Telefon: z.string().optional(),
  'E-mail': z.string().optional(),
  'Obchodni-jmeno': z.string().optional(),
  Ico: z.string().optional(),
  Dic: z.string().optional(),
  'Rodne-cislo': z.string().optional(),
  Jmeno: z.string().optional(),
  Prijmeni: z.string().optional(),
  'Id-dat-schranky': z.string().optional(),
  Verifikace: z.string(),
  Aktivita: z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=GIN&version=525&methodName=najdi-esu&type=response
const najdiEsuResponseSchema = z.object({
  'Najdi-esu': coercedArray(najdiEsuSchema),
})

export type GinNajdiEsuNajdiEsuItem = z.infer<typeof najdiEsuSchema>
export type GinNajdiEsuResponse = z.infer<typeof najdiEsuResponseSchema>

export async function najdiEsu(
  this: Ginis,
  requestNajdiEsu: GinNajdiEsuRequest,
  requestRizeniPrehledu: GinNajdiEsuRequestRizeniPrehledu
): Promise<GinNajdiEsuResponse> {
  const url = this.config.urls.gin
  if (!url) throw new GinisError('GINIS SDK Error: Missing GIN url in GINIS config')

  const requestName = 'Najdi-esu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-gin/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/gin/esu/najdi-esu/request/v_1.0.0.0',
      paramsBodies: [requestNajdiEsu, requestRizeniPrehledu],
      paramOrders: najdiEsuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, najdiEsuResponseSchema)
}
