import { z } from 'zod'

import { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
} from '../../utils/request-util'

const nacistSouborRequestProperties = ['Id-souboru'] as const

export type UdeNacistSouborRequest = {
  [K in (typeof nacistSouborRequestProperties)[number] as K]?: string
}

const nacistSouborSchema = z.object({
  /**
   * Jméno el. souboru.
   * string
   * Max. délka: 254, Min. délka: 1,
   */
  'Jmeno-souboru': z.string(),
  /**
   * Binární data souboru v base64 formátu.
   * base64Binary
   */
  Data: z.string(),
})

const nacistSouborResponseSchema = z.object({
  /**
   * Nacist-soubor - vyžadován: Ne , max. výskyt: 1
   */
  'Nacist-soubor': nacistSouborSchema.optional(),
})

export type UdeNacistSouborNacistSoubor = z.infer<typeof nacistSouborSchema>
export type UdeNacistSouborResponse = z.infer<typeof nacistSouborResponseSchema>

export async function nacistSoubor(
  this: Ginis,
  bodyObj: UdeNacistSouborRequest
): Promise<UdeNacistSouborResponse> {
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
  return await extractResponseJson(response.data, requestName, nacistSouborResponseSchema)
}
