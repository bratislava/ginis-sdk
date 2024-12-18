import type { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-referenta&type=request
const detailReferentaRequestProperties = ['Id-osoby'] as const

export type DetailReferentaRequest = {
  [K in (typeof detailReferentaRequestProperties)[number] as K]?: string
}

type DetailReferentaResponseItem = {
  'Id-osoby': string
  Aktivita: string
  Nazev?: string
  Zkratka?: string
  Jmeno?: string
  Prijmeni?: string
  Poznamka?: string
  'Datum-od': string
  'Datum-do': string
  'Id-spisoveho-uzlu': string
  Login?: string
  'Alt-login'?: string
  'Ext-sys-login'?: string
  'Titul-pred'?: string
  'Titul-za'?: string
  'Osobni-cislo'?: string
  'Rodne-cislo'?: string
  'Rodne-prijmeni'?: string
  Mail?: string
  Telefon?: string
  'Telefon-privat'?: string
  'Telefon-mobil'?: string
  Fax?: string
  'Datum-zmena': string
  'Login-cs'?: string
  'Alt-login-cs'?: string
  /**
   * Kód typu autentizace. Hodnoty: -10 = žádná/není určeno, 0 = databázová, 10 = Windows, 20 = virtuální účet, 30 = Azure AD
   */
  'Typ-autentizace-kod': string
  /**
   * 	Kód typu autentizace k alternativnímu účtu. Hodnoty: -10 = žádná/není určeno, 0 = databázová, 10 = Windows, 20 = virtuální účet, 30 = Azure AD
   */
  'Alt-typ-autentizace-kod': string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-referenta&type=response
export type DetailReferentaXrg = {
  ixsExt?: string
  'Detail-referenta': DetailReferentaResponseItem
}

export async function detailReferenta(
  this: Ginis,
  bodyObj: DetailReferentaRequest
): Promise<DetailReferentaXrg> {
  const url = this.config.urls.gin
  if (!url) throw new GinisError('GINIS SDK Error: Missing GIN url in GINIS config')

  const requestName = 'Detail-referenta'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-gin/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/gin/detail-referenta/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: detailReferentaRequestProperties,
    }),
    this.config.debug
  )
  return extractResponseJson<DetailReferentaXrg>(response.data, requestName)
}
