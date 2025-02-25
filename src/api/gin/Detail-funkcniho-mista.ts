import { z } from 'zod'

import type { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
} from '../../utils/request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-funkcniho-mista&type=request
const detailFunkcnihoMistaRequestProperties = ['Id-funkce'] as const

export type GinDetailFunkcnihoMistaRequest = {
  [K in (typeof detailFunkcnihoMistaRequestProperties)[number] as K]?: string
}

const detailFunkcnihoMistaSchema = z.object({
  'Id-funkce': z.string(),
  Aktivita: z.string(),
  Nazev: z.string().optional(),
  Zkratka: z.string().optional(),
  'Oficialni-nazev': z.string().optional(),
  Poznamka: z.string().optional(),
  'Datum-od': z.string(),
  'Datum-do': z.string(),
  'Id-spisoveho-uzlu': z.string(),
  'Nazev-spisoveho-uzlu': z.string().optional(),
  'Zkratka-spisoveho-uzlu': z.string().optional(),
  'Uroven-funkce': z.string(),
  'Kod-funkce': z.string().optional(),
  'Id-nad': z.string().optional(),
  'Id-referenta': z.string(),
  'Nazev-referenta': z.string().optional(),
  'Id-orj': z.string(),
  'Nazev-orj': z.string().optional(),
  'Kod-mistnosti': z.string().optional(),
  Url: z.string().optional(),
  Mail: z.string().optional(),
  Telefon: z.string().optional(),
  Fax: z.string().optional(),
  'Datum-zmena': z.string(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-funkcniho-mista&type=response
const detailFunkcnihoMistaResponseSchema = z.object({
  'Detail-funkcniho-mista': detailFunkcnihoMistaSchema,
})

export type GinDetailFunkcnihoMistaDetailFunkcnihoMista = z.infer<typeof detailFunkcnihoMistaSchema>
export type GinDetailFunkcnihoMistaResponse = z.infer<typeof detailFunkcnihoMistaResponseSchema>

export async function detailFunkcnihoMista(
  this: Ginis,
  bodyObj: GinDetailFunkcnihoMistaRequest
): Promise<GinDetailFunkcnihoMistaResponse> {
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
  return await extractResponseJson(response.data, requestName, detailFunkcnihoMistaResponseSchema)
}
