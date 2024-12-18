import type { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-funkcniho-mista&type=request
const detailFunkcnihoMistaRequestProperties = ['Id-funkce'] as const

export type DetailFunkcnihoMistaRequest = {
  [K in (typeof detailFunkcnihoMistaRequestProperties)[number] as K]?: string
}

type DetailFunkcnihoMistaResponseItem = {
  'Id-funkce': string
  Aktivita: string
  Nazev?: string
  Zkratka?: string
  'Oficialni-nazev'?: string
  Poznamka?: string
  'Datum-od': string
  'Datum-do': string
  'Id-spisoveho-uzlu': string
  'Nazev-spisoveho-uzlu'?: string
  'Zkratka-spisoveho-uzlu'?: string
  'Uroven-funkce': string
  'Kod-funkce'?: string
  'Id-nad'?: string
  'Id-referenta': string
  'Nazev-referenta'?: string
  'Id-orj': string
  'Nazev-orj'?: string
  'Kod-mistnosti'?: string
  Url?: string
  Mail?: string
  Telefon?: string
  Fax?: string
  'Datum-zmena': string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-funkcniho-mista&type=response
export interface DetailFunkcnihoMistaXrg {
  ixsExt?: string
  'Detail-funkcniho-mista': DetailFunkcnihoMistaResponseItem
}

export async function detailFunkcnihoMista(
  this: Ginis,
  bodyObj: DetailFunkcnihoMistaRequest
): Promise<DetailFunkcnihoMistaXrg> {
  const url = this.config.urls.gin
  if (!url) throw new GinisError('GINIS SDK Error: Missing GIN url in GINIS config')

  const requestName = 'Detail-funkcniho-mista'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-gin/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/gin/detail-funkcniho-mista/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: detailFunkcnihoMistaRequestProperties,
    }),
    this.config.debug
  )
  return extractResponseJson<DetailFunkcnihoMistaXrg>(response.data, requestName)
}
