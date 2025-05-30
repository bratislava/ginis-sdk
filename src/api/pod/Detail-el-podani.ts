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
import { coercedArray } from '../../utils/validation'

const detailElPodaniRequestProperties = [
  'Id-zpravy',
  'Id-el-podani',
  'Id-esu',
  'Id-eu',
  'Zaradit-navazane',
] as const

export type PodDetailElPodaniRequest = {
  [K in (typeof detailElPodaniRequestProperties)[number] as K]?: string
}

const detailElPodaniParamOrders: RequestParamOrder[] = [
  {
    name: 'Detail-el-podani',
    params: detailElPodaniRequestProperties,
  },
]

const detailElPodaniSchema = z.object({
  'Datum-prijeti': z.string(),
  'Stav-zpracovani': z.string(),
  'Duvod-odmitnuti': z.string().optional(),
  'Stav-podani-kod': z.string(),
  'Stav-podani-text': z.string().optional(),
  'Stav-odpovedi-kod': z.string(),
  'Stav-odpovedi-text': z.string().optional(),
  'Id-dokumentu': z.string().optional(),
  Vec: z.string().optional(),
  'Spis-znacka': z.string().optional(),
  Znacka: z.string().optional(),
})

const navazanyDokumentSchema = z.object({
  'Id-dokumentu': z.string(),
  Vec: z.string().optional(),
  'Spis-znacka': z.string().optional(),
  Znacka: z.string().optional(),
})

const detailElPodaniResponseSchema = z.object({
  'Detail-el-podani': detailElPodaniSchema,
  'Navazany-dokument': coercedArray(navazanyDokumentSchema),
})

export type PodDetailElPodaniDetailElPodani = z.infer<typeof detailElPodaniSchema>
export type PodDetailElPodaniNavazanyDokumentItem = z.infer<typeof navazanyDokumentSchema>
export type PodDetailElPodaniResponse = z.infer<typeof detailElPodaniResponseSchema>

export async function detailElPodani(
  this: Ginis,
  bodyObj: PodDetailElPodaniRequest
): Promise<PodDetailElPodaniResponse> {
  const url = this.config.urls.pod
  if (!url) throw new GinisError('GINIS SDK Error: Missing POD url in GINIS config')

  const requestName = 'Detail-el-podani'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-pod/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/pod/detail-el-podani/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: detailElPodaniParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, detailElPodaniResponseSchema)
}
