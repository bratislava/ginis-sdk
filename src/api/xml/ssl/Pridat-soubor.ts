import type { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

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

export type PridatSouborRequest = {
  [K in (typeof pridatSouborRequestProperties)[number] as K]?: string
}

type PridatSouborReponseItem = {
  'Datum-zmeny': string
  'Id-souboru': string
  'Verze-souboru': string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=pridat-soubor&type=response
export type PridatSouborXrg = {
  ixsExt?: string
  'Pridat-soubor': PridatSouborReponseItem
}

export async function pridatSoubor(
  this: Ginis,
  bodyObj: PridatSouborRequest
): Promise<PridatSouborXrg> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Pridat-soubor'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ssl/wfl-dokument/pridat-soubor/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: pridatSouborRequestProperties,
    }),
    this.config.debug
  )
  return await extractResponseJson<PridatSouborXrg>(response.data, requestName)
}
