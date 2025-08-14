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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=zaloz-cj&type=request
const zalozCjRequestProperties = ['Id-init-dokumentu', 'Denik-cj', 'Rok-cj', 'Poradove-cislo-cj']

export type SslZalozCjRequest = {
  [K in (typeof zalozCjRequestProperties)[number] as K]?: RequestParamType
}

const zalozCjParamOrders: RequestParamOrder[] = [
  {
    name: 'Zaloz-cj',
    params: zalozCjRequestProperties,
  },
]

const zalozCjSchema = z.object({
  'Id-init-dokumentu': z.string(),
  'Denik-cj': z.string(),
  'Rok-cj': z.string(),
  'Poradove-cislo-cj': z.string(),
  'Vec-cj': z.string().optional(),
  'Znacka-cj': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=zaloz-cj&type=response
const ZalozCjResponseSchema = z.object({
  'Zaloz-cj': zalozCjSchema,
})

export type SslZalozCjZalozCj = z.infer<typeof zalozCjSchema>
export type SslZalozCjResponse = z.infer<typeof ZalozCjResponseSchema>

/** Cj = číslo jednacie */
export async function zalozCj(
  this: Ginis,
  bodyObj: SslZalozCjRequest
): Promise<SslZalozCjResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Zaloz-cj'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ssl/wfl-dokument/zaloz-cj/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: zalozCjParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, ZalozCjResponseSchema)
}
