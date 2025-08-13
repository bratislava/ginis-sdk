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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=zaloz-pisemnost&type=request
const wflDokumentRequestProperties = [
  'Id-dokumentu',
  'Vec',
  'Znacka',
  'Id-typu-dokumentu',
  'Priznak-fyz-existence',
  'Barcode',
]

export type SslZalozPisemnostRequestWflDokument = {
  [K in (typeof wflDokumentRequestProperties)[number] as K]?: string
}

const doruceniRequestProperties = [
  'Stat',
  'Psc',
  'Psc-nazev',
  'Datum-odeslani',
  'Znacka-odesilatele',
  'Datum-ze-dne',
  'Podaci-cislo',
  'Zpusob-doruceni',
  'Druh-zasilky',
  'Druh-zachazeni',
  'Datum-prijmu-podani',
  'Id-odesilatele',
  'Pocet-listu',
  'Pocet-priloh',
  'Pocet-stran',
  'Pocet-kopii',
  'Pocet-listu-priloh',
  'Poznamka-k-doruceni',
]

export type SslZalozPisemnostRequestDoruceni = {
  [K in (typeof doruceniRequestProperties)[number] as K]?: string
}

const sslDokumentRequestProperties = [
  'Pristup',
  'Id-stupne-utajeni',
  'Vec-podrobne',
  'Poznamka',
  'Pocet-listu',
  'Pocet-priloh',
  'Pocet-stran',
  'Pocet-kopii',
  'Pocet-listu-priloh',
  'Umisteni',
  'Id-funkce-resitele',
  'Id-spisoveho-planu',
  'Id-spisoveho-znaku',
  'Datum-podani',
]

export type SslZalozPisemnostRequestSslDokument = {
  [K in (typeof sslDokumentRequestProperties)[number] as K]?: string
}

const prehledDokumentuParamOrders: RequestParamOrder[] = [
  {
    name: 'Wfl-dokument',
    params: wflDokumentRequestProperties,
  },
  {
    name: 'Doruceni',
    params: doruceniRequestProperties,
  },
  {
    name: 'Ssl-dokument',
    params: sslDokumentRequestProperties,
  },
]

const zalozPisemnostSchema = z.object({
  'Id-dokumentu': z.string(),
  'Datum-zmeny': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=525&methodName=zaloz-pisemnost&type=response
const ZalozPisemnostResponseSchema = z.object({
  'Zaloz-pisemnost': zalozPisemnostSchema,
})

export type SslZalozPisemnostZalozPisemnost = z.infer<typeof zalozPisemnostSchema>
export type SslZalozPisemnostResponse = z.infer<typeof ZalozPisemnostResponseSchema>

export async function zalozPisemnost(
  this: Ginis,
  requestWflDokument: SslZalozPisemnostRequestWflDokument,
  requestDoruceni: SslZalozPisemnostRequestDoruceni,
  requestSslDokument: SslZalozPisemnostRequestSslDokument
): Promise<SslZalozPisemnostResponse> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Zaloz-pisemnost'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ssl/wfl-dokument/zaloz-pisemnost/request/v_1.0.0.0',
      paramsBodies: [requestWflDokument, requestDoruceni, requestSslDokument],
      paramOrders: prehledDokumentuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, ZalozPisemnostResponseSchema)
}
