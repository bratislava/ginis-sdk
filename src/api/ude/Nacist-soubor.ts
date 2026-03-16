import { pipeline, Readable } from 'stream'
import { z } from 'zod'

import { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
  RequestParamOrder,
  RequestParamType,
} from '../../utils/request-utils'
import { XmlBase64DataStreamParser } from '../../utils/stream-utils'

const nacistSouborRequestProperties = ['Id-souboru'] as const

export type UdeNacistSouborRequest = {
  [K in (typeof nacistSouborRequestProperties)[number] as K]?: RequestParamType
}

const nacistSouborParamOrders: RequestParamOrder[] = [
  {
    name: 'Nacist-soubor',
    params: nacistSouborRequestProperties,
  },
]

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

export const nacistSouborResponseSchema = z.object({
  /**
   * Nacist-soubor - vyžadován: Ne , max. výskyt: 1
   */
  'Nacist-soubor': nacistSouborSchema.optional(),
})

export type UdeNacistSouborNacistSoubor = z.infer<typeof nacistSouborSchema>
export type UdeNacistSouborResponse = z.infer<typeof nacistSouborResponseSchema>
export type UdeNacistSouborStream = Readable & {
  response: Promise<UdeNacistSouborResponse>
}

const requestName = 'Nacist-soubor'
const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'
const requestXrgNamespace = 'http://www.gordic.cz/xrg/ude/nacist-soubor/request/v_1.0.0.0'

export async function nacistSoubor(
  this: Ginis,
  bodyObj: UdeNacistSouborRequest
): Promise<UdeNacistSouborResponse> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: requestXrgNamespace,
      paramsBodies: [bodyObj],
      paramOrders: nacistSouborParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, nacistSouborResponseSchema)
}

/**
 * Streaming variant downloading files from GINIS UDE (Úřední deska) service.
 *
 * **Why this exists:** The non-streaming version loads the entire SOAP XML
 * response into memory, parses it with xml2js, then base64-decodes the file.
 * For large files (50-200+ MB) this causes memory spikes of several GB
 * (the base64 string + parsed object + decoded buffer all coexist in memory).
 *
 * `UdeNacistSouborResponse` is exposed via a promise in `response` attribute.
 * The attribute `Data` in the response will always have value "placeholder",
 * as the actual data will be available in the readable stream instead.
 *
 * @param bodyObj - Request parameters. See `UdeNacistSouborRequest` type for details.
 * @returns Stream of decoded binary data with response data available in `response` attribute.
 * @throws {GinisError} on network errors, SOAP faults, or malformed responses.
 */
export async function nacistSouborStream(
  this: Ginis,
  bodyObj: UdeNacistSouborRequest
): Promise<UdeNacistSouborStream> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const response = await makeAxiosRequest<Readable>(
    { ...createXmlRequestConfig(requestName, requestNamespace), responseType: 'stream' },
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: requestXrgNamespace,
      paramsBodies: [bodyObj],
      paramOrders: nacistSouborParamOrders,
    }),
    this.config.debug
  )

  const parser = new XmlBase64DataStreamParser<UdeNacistSouborResponse>({
    responseValidation: {
      requestName,
      responseSchema: nacistSouborResponseSchema,
    },
  })
  pipeline(response.data, parser, (error) => {
    if (error && !parser.destroyed) {
      parser.destroy(error instanceof Error ? error : new Error(String(error)))
    }
  })
  // Stream consumers may ignore `response`; prevent unhandled rejections.
  parser.response.catch(() => undefined)

  return parser as UdeNacistSouborStream
}
