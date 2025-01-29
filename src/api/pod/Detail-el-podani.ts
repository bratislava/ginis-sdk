import type { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

const detailElPodaniRequestProperties = [
  'Id-zpravy',
  'Id-el-podani',
  'Id-esu',
  'Id-eu',
  'Zaradit-navazane',
] as const

export type DetailElPodaniRequest = {
  [K in (typeof detailElPodaniRequestProperties)[number] as K]?: string
}
type DetailElPodaniResponseItem = {
  'Datum-prijeti': string
  'Stav-zpracovani': string
  'Duvod-odmitnuti'?: string
  'Stav-podani-kod': string
  'Stav-podani-text'?: string
  'Stav-odpovedi-kod': string
  'Stav-odpovedi-text'?: string
  'Id-dokumentu'?: string
  Vec?: string
  'Spis-znacka'?: string
  Znacka?: string
}

type NavazanyDokumentResponseItem = {
  'Id-dokumentu': string
  Vec?: string
  'Spis-znacka'?: string
  Znacka?: string
}

export type DetailElPodaniXrg = {
  ixsExt?: string
  'Detail-el-podani': DetailElPodaniResponseItem
  'Navazany-dokument'?: NavazanyDokumentResponseItem | NavazanyDokumentResponseItem[]
}

export async function detailElPodani(
  this: Ginis,
  bodyObj: DetailElPodaniRequest
): Promise<DetailElPodaniXrg> {
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
      paramsBody: bodyObj,
      paramOrder: detailElPodaniRequestProperties,
    }),
    this.config.debug
  )
  return await extractResponseJson<DetailElPodaniXrg>(response.data, requestName)
}
