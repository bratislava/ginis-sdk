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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=GIN&version=525&methodName=edit-esu&type=request
const vytvorEsuRequestProperties = [
  'Id-esu',
  'Typ-esu',
  'Nazev',
  'Zkratka',
  'Poznamka',
  'Verifikace',
  'Stat',
  'Psc',
  'Obec',
  'Cast-obce',
  'Ulice',
  'Cislo-orientacni',
  'Cislo-popisne',
  'Kod-uir-adr',
  'Po-box',
  'Telefon',
  'E-mail',
  'Fax',
  'Obchodni-jmeno',
  'Typ-organizace',
  'Ico',
  'Dic',
  'Rodne-cislo',
  'Jmeno',
  'Prijmeni',
  'Titul-pred',
  'Titul-za',
  'Esu-txt',
  'Radek-obalky0',
  'Radek-obalky1',
  'Radek-obalky2',
  'Radek-obalky3',
  'Radek-obalky4',
  'Radek-obalky5',
  'Radek-obalky6',
  'Radek-obalky7',
  'Platce-dph',
  'Datum-narozeni',
  'Datum-umrti',
  'Uroven-pristupu',
  'Url',
  'Rodne-prijmeni',
  'Id-dat-schranky',
  'Typ-adr',
  'Id-esu-hlavni',
  'Duvod-ucel',
  'Id-eu',
  'Url-autority',
  'Osobni-cislo',
  'Prevzit-adresu-podle-kod-uir-adr',
  'Statni-prislusnost',
] as const

export type GinEditEsuRequestVytvorEsu = {
  [K in (typeof vytvorEsuRequestProperties)[number] as K]?: RequestParamType
}

const editEsuParamOrders: RequestParamOrder[] = [
  {
    name: 'Vytvor-esu',
    params: vytvorEsuRequestProperties,
  },
]

const vytvorEsuSchema = z.object({
  'Id-esu': z.string(),
  'Datum-zmeny': z.string(),
  'Provedena-operace': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=GIN&version=525&methodName=edit-esu&type=response
const editEsuResponseSchema = z.object({
  'Vytvor-esu': vytvorEsuSchema,
})

export type GinEditEsuVytvorEsu = z.infer<typeof vytvorEsuSchema>
export type GinEditEsuResponse = z.infer<typeof editEsuResponseSchema>

export async function editEsu(
  this: Ginis,
  bodyObj: GinEditEsuRequestVytvorEsu
): Promise<GinEditEsuResponse> {
  const url = this.config.urls.gin
  if (!url) throw new GinisError('GINIS SDK Error: Missing GIN url in GINIS config')

  const requestName = 'Edit-esu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-gin/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/gin/esu/vytvor-esu/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: editEsuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, editEsuResponseSchema)
}
