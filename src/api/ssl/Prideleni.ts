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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=prideleni&type=request
const prideleniRequestProperties = [
  'Id-dokumentu',
  'Id-uzlu',
  'Id-funkce',
  'Id-osoby',
  'Ucel-distribuce',
  'Prime-prideleni',
]

export type SslPrideleniRequest = {
  [K in (typeof prideleniRequestProperties)[number] as K]?: RequestParamType
}

const prideleniParamOrders: RequestParamOrder[] = [
  {
    name: 'Prideleni',
    params: prideleniRequestProperties,
  },
]

const prideleniSchema = z.object({
  'Datum-zmeny': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=prideleni&type=response
const prideleniResponseSchema = z.object({
  Prideleni: prideleniSchema,
})

export type SslPrideleniPrideleni = z.infer<typeof prideleniSchema>
export type SslPrideleniResponse = z.infer<typeof prideleniResponseSchema>

export async function prideleni(
  this: Ginis,
  bodyObj: SslPrideleniRequest
): Promise<SslPrideleniResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Prideleni'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ssl/wfl-dokument/prideleni/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: prideleniParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, prideleniResponseSchema)
}
