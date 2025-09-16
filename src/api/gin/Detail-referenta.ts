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

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-referenta&type=request
const detailReferentaRequestProperties = ['Id-osoby'] as const

export type GinDetailReferentaRequest = {
  [K in (typeof detailReferentaRequestProperties)[number] as K]?: RequestParamType
}

const detailReferentaParamOrders: RequestParamOrder[] = [
  {
    name: 'Detail-referenta',
    params: detailReferentaRequestProperties,
  },
]

const detailReferentaSchema = z.object({
  'Id-osoby': z.string(),
  Aktivita: z.string(),
  Nazev: z.string().optional(),
  Zkratka: z.string().optional(),
  Jmeno: z.string().optional(),
  Prijmeni: z.string().optional(),
  Poznamka: z.string().optional(),
  'Datum-od': z.string(),
  'Datum-do': z.string(),
  'Id-spisoveho-uzlu': z.string(),
  Login: z.string().optional(),
  'Alt-login': z.string().optional(),
  'Ext-sys-login': z.string().optional(),
  'Titul-pred': z.string().optional(),
  'Titul-za': z.string().optional(),
  'Osobni-cislo': z.string().optional(),
  'Rodne-cislo': z.string().optional(),
  'Rodne-prijmeni': z.string().optional(),
  Mail: z.string().optional(),
  Telefon: z.string().optional(),
  'Telefon-privat': z.string().optional(),
  'Telefon-mobil': z.string().optional(),
  Fax: z.string().optional(),
  'Datum-zmena': z.string(),
  'Login-cs': z.string().optional(),
  'Alt-login-cs': z.string().optional(),
  /**
   * Kód typu autentizace. Hodnoty: -10 = žádná/není určeno, 0 = databázová, 10 = Windows, 20 = virtuální účet, 30 = Azure AD
   */
  'Typ-autentizace-kod': z.string(),
  /**
   * 	Kód typu autentizace k alternativnímu účtu. Hodnoty: -10 = žádná/není určeno, 0 = databázová, 10 = Windows, 20 = virtuální účet, 30 = Azure AD
   */
  'Alt-typ-autentizace-kod': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-referenta&type=response
const detailReferentaResponseSchema = z.object({
  'Detail-referenta': detailReferentaSchema,
})

export type GinDetailReferentaDetailReferenta = z.infer<typeof detailReferentaSchema>
export type GinDetailReferentaResponse = z.infer<typeof detailReferentaResponseSchema>

export async function detailReferenta(
  this: Ginis,
  bodyObj: GinDetailReferentaRequest
): Promise<GinDetailReferentaResponse> {
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
      paramsBodies: [bodyObj],
      paramOrders: detailReferentaParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, detailReferentaResponseSchema)
}
