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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=nastavit-vlastnost-dokumentu&type=request
const nastavitVlastnostDokumentuRequestProperties = [
  'Id-dokumentu',
  'Id-profilu',
  'Kod-profilu',
  'Id-struktury',
  'Kod-struktury',
  'Id-vlastnosti',
  'Kod-vlastnosti',
  'Poradove-cislo',
  'Hodnota-raw',
  'Hodnota-popis',
]

export type SslNastavitVlastnostDokumentuRequest = {
  [K in (typeof nastavitVlastnostDokumentuRequestProperties)[number] as K]?: RequestParamType
}

const nastavitVlastnostDokumentuParamOrders: RequestParamOrder[] = [
  {
    name: 'Nastavit-vlastnost-dokumentu',
    params: nastavitVlastnostDokumentuRequestProperties,
  },
]

const nastavitVlastnostDokumentuSchema = z.object({
  'Id-dokumentu': z.string(),
  'Id-profilu': z.string(),
  'Id-struktury': z.string(),
  'Id-vlastnosti': z.string(),
  'Poradove-cislo': z.string(),
  'Hodnota-raw': z.string().optional(),
  'Hodnota-popis': z.string().optional(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=nastavit-vlastnost-dokumentu&type=response
const NastavitVlastnostDokumentuResponseSchema = z.object({
  'Nastavit-vlastnost-dokumentu': nastavitVlastnostDokumentuSchema,
})

export type SslNastavitVlastnostDokumentuNastavitVlastnostDokumentu = z.infer<
  typeof nastavitVlastnostDokumentuSchema
>
export type SslNastavitVlastnostDokumentuResponse = z.infer<
  typeof NastavitVlastnostDokumentuResponseSchema
>

export async function nastavitVlastnostDokumentu(
  this: Ginis,
  bodyObj: SslNastavitVlastnostDokumentuRequest
): Promise<SslNastavitVlastnostDokumentuResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Nastavit-vlastnost-dokumentu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace:
        'http://www.gordic.cz/xrg/ssl/wfl-dokument/nastavit-vlastnost-dokumentu/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: nastavitVlastnostDokumentuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(
    response.data,
    requestName,
    NastavitVlastnostDokumentuResponseSchema
  )
}
