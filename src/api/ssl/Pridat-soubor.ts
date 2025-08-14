import { Readable } from 'stream'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

import type { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createMultipartRequestBody,
  createMultipartRequestConfig,
  createXmlRequestBody,
  createXmlRequestConfig,
  extractMultipartResponseJson,
  extractResponseJson,
  RequestParamOrder,
  RequestParamType,
} from '../../utils/request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=pridat-soubor&type=request
const pridatSouborRequestProperties = [
  'Id-dokumentu',
  'Id-souboru',
  'Jmeno-souboru',
  'Typ-vazby',
  'Popis-souboru',
  'Podrobny-popis-souboru',
  'Data',
  'Kontrola-podpisu',
  'Priz-platna-verze',
  'Priz-archiv-verze',
  'Id-kategorie-typu-prilohy',
] as const

export type SslPridatSouborRequest = {
  [K in (typeof pridatSouborRequestProperties)[number] as K]?: RequestParamType
}

const pridatSouborParamOrders: RequestParamOrder[] = [
  {
    name: 'Pridat-soubor',
    params: pridatSouborRequestProperties,
  },
]

const pridatSouborSchema = z.object({
  'Datum-zmeny': z.string(),
  'Id-souboru': z.string(),
  'Verze-souboru': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=pridat-soubor&type=response
const pridatSouborResponseSchema = z.object({
  'Pridat-soubor': pridatSouborSchema,
})

export type SslPridatSouborPridatSoubor = z.infer<typeof pridatSouborSchema>
export type SslPridatSouborResponse = z.infer<typeof pridatSouborResponseSchema>

const requestName = 'Pridat-soubor'
const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'
const requestXrgNamespace =
  'http://www.gordic.cz/xrg/ssl/wfl-dokument/pridat-soubor/request/v_1.0.0.0'

export async function pridatSoubor(
  this: Ginis,
  bodyObj: SslPridatSouborRequest
): Promise<SslPridatSouborResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestInfo = {
    name: requestName,
    namespace: requestNamespace,
    xrgNamespace: requestXrgNamespace,
    paramsBodies: [bodyObj],
    paramOrders: pridatSouborParamOrders,
  }

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, requestInfo),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, pridatSouborResponseSchema)
}

export async function pridatSouborMtom(
  this: Ginis,
  bodyObj: SslPridatSouborRequest,
  fileStream?: Readable
): Promise<SslPridatSouborResponse> {
  let fileContent = fileStream
  if (!fileContent) {
    fileContent = new Readable({
      read() {
        this.push(null)
      },
    })
  }

  const url = this.config.urls.ssl_mtom
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestInfo = {
    name: requestName,
    namespace: requestNamespace,
    xrgNamespace: requestXrgNamespace,
    paramsBodies: [bodyObj],
    paramOrders: pridatSouborParamOrders,
  }
  const requestContentId = 'soap-req'
  const fileContentId = 'attachment-file'
  const boundary = `----Boundary${uuidv4()}`

  bodyObj.Data = fileContentId

  const requestBody = createMultipartRequestBody(
    this.config,
    requestInfo,
    fileContent,
    boundary,
    requestContentId,
    fileContentId
  )

  const requestHeaders = createMultipartRequestConfig(
    requestName,
    requestNamespace,
    boundary,
    requestContentId
  )

  const response = await makeAxiosRequest<string>(
    requestHeaders,
    url,
    requestBody,
    this.config.debug
  )
  return extractMultipartResponseJson(response.data, requestName, pridatSouborResponseSchema)
}
