import { ReadStream } from 'fs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

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

/**
 * File can be provided according to the documentation as base64 encoded string
 * of its content inside of the Data attribute to send using a regular request.
 *
 * It is also possible to provide file as byte array inside of Obsah attribute.
 * In this scenario a multipart request is sent and the file is send using MTOM XOP
 * inside of Mime envelope. It allows for much faster a larger file transfers.
 */
export type PridatSouborRequest = {
  [K in (typeof pridatSouborRequestProperties)[number] as K]?: string
} & {
  Obsah?: ReadStream
}

const pridatSouborSchema = z.object({
  'Datum-zmeny': z.string(),
  'Id-souboru': z.string(),
  'Verze-souboru': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=pridat-soubor&type=response
const pridatSouborResponseSchema = z.object({
  'Pridat-soubor': pridatSouborSchema,
})

export type PridatSouborResponse = z.infer<typeof pridatSouborResponseSchema>

const requestName = 'Pridat-soubor'
const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'
const requestXrgNamespace =
  'http://www.gordic.cz/xrg/ssl/wfl-dokument/pridat-soubor/request/v_1.0.0.0'

export async function pridatSoubor(
  this: Ginis,
  bodyObj: PridatSouborRequest
): Promise<PridatSouborResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  let requestInfo = {
    name: requestName,
    namespace: requestNamespace,
    xrgNamespace: requestXrgNamespace,
    paramsBody: bodyObj,
    paramOrder: pridatSouborRequestProperties,
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
  bodyObj: PridatSouborRequest
): Promise<PridatSouborResponse> {
  if (!bodyObj.Obsah) {
    bodyObj.Obsah = new ReadStream()
  }

  const url = this.config.urls.ssl_mtom
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  let requestInfo = {
    name: requestName,
    namespace: requestNamespace,
    xrgNamespace: requestXrgNamespace,
    paramsBody: bodyObj,
    paramOrder: pridatSouborRequestProperties,
  }
  const requestContentId = 'soap-req'
  const fileContentId = 'attachment-file'
  const boundary = '----Boundary' + uuidv4()

  bodyObj.Data = fileContentId

  let requestBody = createMultipartRequestBody(
    this.config,
    requestInfo,
    bodyObj.Obsah,
    boundary,
    requestContentId,
    fileContentId
  )

  let requestHeaders = createMultipartRequestConfig(
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
