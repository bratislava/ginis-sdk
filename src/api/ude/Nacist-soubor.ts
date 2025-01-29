import { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

const nacistSouborRequestProperties = ['Id-souboru'] as const

type NacistSouborRequestBody = {
  [K in (typeof nacistSouborRequestProperties)[number] as K]?: string
}

type NacistSouborResponseItem = {
  /**
   * Jméno el. souboru.
   * string
   * Max. délka: 254, Min. délka: 1,
   */
  'Jmeno-souboru': string
  /**
   * Binární data souboru v base64 formátu.
   * base64Binary
   */
  Data: string
}

export type NacistSouborResponseXrg = {
  ixsExt: string
  /**
   * Nacist-soubor - vyžadován: Ne , max. výskyt: 1
   */
  'Nacist-soubor'?: NacistSouborResponseItem
}

export async function nacistSoubor(
  this: Ginis,
  bodyObj: NacistSouborRequestBody
): Promise<NacistSouborResponseXrg> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const requestName = 'Nacist-soubor'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ude/nacist-soubor/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: nacistSouborRequestProperties,
    }),
    this.config.debug
  )
  return await extractResponseJson<NacistSouborResponseXrg>(response.data, requestName)
}
