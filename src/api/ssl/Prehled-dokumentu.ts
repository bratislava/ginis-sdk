import { z } from 'zod'

import type { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
  RequestParamOrder,
} from '../../utils/request-util'
import { coercedArray } from '../../utils/validation'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=prehled-dokumentu&type=request
const prehledDokumentuRequestProperties = [
  'Id-osoby-akt',
  'Id-funkce-akt',
  'Id-uzlu-akt',
  'Datum-podani-od',
  'Datum-podani-do',
  'Priznak-spisu',
  'Priznak-cj',
  'Id-agendy',
  'Id-odesilatele',
  'Stav-dokumentu',
  'Id-typu-dokumentu',
  'Datum-zmeny-od',
  'Datum-zmeny-do',
  'Id-spisoveho-planu',
  'Id-spisoveho-znaku',
  'Id-spisu',
  'Denik',
  'Rok',
  'Znacka',
  'Vec',
  'Poradove-cislo-cj',
  'Id-funkce-resitele',
  'Id-funkce-schvalovatele',
  'Datum-zmeny-epx-od',
  'Datum-zmeny-epx-do',
  'Id-dotceneho-esu',
  'Id-profilu',
  'Id-struktury',
  'Id-vlastnosti',
  'Hodnota-vlastnosti-raw',
]

export type SslPrehledDokumentuRequest = {
  [K in (typeof prehledDokumentuRequestProperties)[number] as K]?: string
}

const rizeniPrehleduRequestProperties = [
  'Priznak-generovani',
  'Radek-od',
  'Radek-do',
  'Priznak-zachovani',
  'Rozsah-prehledu',
]

export type SslPrehledDokumentuRequestRizeniPrehledu = {
  [K in (typeof rizeniPrehleduRequestProperties)[number] as K]?: string
}

const prehledDokumentuParamOrders: RequestParamOrder[] = [
  {
    name: 'Prehled-dokumentu',
    params: prehledDokumentuRequestProperties,
  },
  {
    name: 'Rizeni-prehledu',
    params: rizeniPrehleduRequestProperties,
  },
]

const prehledDokumentuSchema = z.object({
  'Id-dokumentu': z.string(),
  'Id-spisu': z.string(),
  'Priznak-spisu': z.string(),
  'Priznak-cj': z.string(),
  'Id-funkce-vlastnika': z.string(),
  Vec: z.string().optional(),
  Znacka: z.string().optional(),
  'Stav-distribuce': z.string(),
  'Stav-dokumentu': z.string(),
  'Id-agendy': z.string(),
  'Id-typu-dokumentu': z.string(),
  'Priznak-doruceni': z.string(),
  'Priznak-evidence-ssl': z.string(),
  'Priznak-fyz-existence': z.string(),
  'Priznak-el-obrazu': z.string(),
  'Misto-vzniku': z.string(),
  'Datum-podani': z.string(),
  'Datum-zmeny': z.string(),
  'Id-zmenu-provedl': z.string(),
  'Id-spisoveho-planu': z.string().optional(),
  'Id-spisoveho-znaku': z.string().optional(),
  'Vec-podrobne': z.string().optional(),
  'Vec-cj': z.string().optional(),
  'Znacka-cj': z.string().optional(),
  'Stav-cj': z.string().optional(),
  'Id-init-dokumentu': z.string().optional(),
  'Id-vyriz-dokumentu': z.string().optional(),
  'Id-odesilatele': z.string().optional(),
  'Id-osoby-vlastnika': z.string(),
})
const stavPrehleduSchema = z.object({
  'Radek-od': z.string(),
  'Radek-do': z.string(),
  'Radku-celkem': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=prehled-dokumentu&type=response
const PrehledDokumentuResponseSchema = z.object({
  'Prehled-dokumentu': coercedArray(prehledDokumentuSchema),
  'Stav-prehledu': stavPrehleduSchema,
})

export type SslPrehledDokumentuPrehledDokumentuItem = z.infer<typeof prehledDokumentuSchema>
export type SslPrehledDokumentuStavPrehledu = z.infer<typeof stavPrehleduSchema>
export type SslPrehledDokumentuResponse = z.infer<typeof PrehledDokumentuResponseSchema>

export async function prehledDokumentu(
  this: Ginis,
  requestPrehledDokumentu: SslPrehledDokumentuRequest,
  requestRizeniPrehledu: SslPrehledDokumentuRequestRizeniPrehledu
): Promise<SslPrehledDokumentuResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Prehled-dokumentu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ssl/wfl-dokument/prehled-dokumentu/request/v_1.0.0.0',
      paramsBodies: [requestPrehledDokumentu, requestRizeniPrehledu],
      paramOrders: prehledDokumentuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, PrehledDokumentuResponseSchema)
}
