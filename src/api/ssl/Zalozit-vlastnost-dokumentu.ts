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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=zalozit-vlastnost-dokumentu&type=request
const zalozitVlastnostDokumentuRequestProperties = [
  'Id-dokumentu',
  'Typ-objektu',
  'Id-objektu',
  'Kod-objektu',
]

export type SslZalozitVlastnostDokumentuRequest = {
  [K in (typeof zalozitVlastnostDokumentuRequestProperties)[number] as K]?: RequestParamType
}

const zalozitVlastnostDokumentuParamOrders: RequestParamOrder[] = [
  {
    name: 'Zalozit-vlastnost-dokumentu',
    params: zalozitVlastnostDokumentuRequestProperties,
  },
]

const zalozitVlastnostDokumentuSchema = z.object({
  'Id-dokumentu': z.string(),
  'Id-profilu': z.string(),
  'Id-struktury': z.string().optional(),
  'Id-vlastnosti': z.string().optional(),
  'Poradove-cislo': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=zalozit-vlastnost-dokumentu&type=response
const zalozitVlastnostDokumentuResponseSchema = z.object({
  'Zalozit-vlastnost-dokumentu': zalozitVlastnostDokumentuSchema,
})

export type SslZalozitVlastnostDokumentuZalozitVlastnostDokumentu = z.infer<
  typeof zalozitVlastnostDokumentuSchema
>
export type SslZalozitVlastnostDokumentuResponse = z.infer<
  typeof zalozitVlastnostDokumentuResponseSchema
>

export async function zalozitVlastnostDokumentu(
  this: Ginis,
  bodyObj: SslZalozitVlastnostDokumentuRequest
): Promise<SslZalozitVlastnostDokumentuResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Zalozit-vlastnost-dokumentu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace:
        'http://www.gordic.cz/xrg/ssl/wfl-dokument/zalozit-vlastnost-dokumentu/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: zalozitVlastnostDokumentuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(
    response.data,
    requestName,
    zalozitVlastnostDokumentuResponseSchema
  )
}
