import type { Ginis } from '../../../ginis'
import { makeAxiosRequest, getGRestHeader, GRestHeader } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'

export type DetailElPodaniRequest = {
  'Id-zpravy'?: string
  'Id-el-podani'?: string
  'Id-esu'?: string
  'Id-eu'?: string
  'Zaradit-navazane'?: string
}

export type DetailElPodaniXrg = {
  'Detail-el-podani': {
    'Datum-prijeti': string
    'Stav-zpracovani': string
    'Duvod-odmitnuti'?: string
    'Stav-podani-kod': string
    'Stav-podani-text'?: string
    'Stav-odpovedi-kod': string
    'Stav-odpovedi-text'?: string
    'Id-dokumentu': string
    Vec?: string
    'Spis-znacka'?: string
    Znacka?: string
  }
  'Navazany-dokument'?: {
    'Id-dokumentu': string
    Vec?: string
    'Spis-znacka'?: string
    Znacka?: string
  }
}

export type DetailElPodaniResponse = {
  GRestHeader: GRestHeader
  Xrg: DetailElPodaniXrg
}

export async function detailElPodani(
  this: Ginis,
  bodyObj: DetailElPodaniRequest
): Promise<DetailElPodaniXrg> {
  const url = this.config.urls.pod
  if (!url) throw new GinisError('GINIS SDK Error: Missing POD url in GINIS config')
  const response = await makeAxiosRequest<DetailElPodaniResponse>(
    undefined,
    `${url}/json/Detail-el-podani`,
    {
      GRestHeader: getGRestHeader(
        this.config,
        'http://www.gordic.cz/xrg/pod/detail-el-podani/request/v_1.0.0.0'
      ),
      Xrg: { 'Detail-el-podani': bodyObj },
    },
    this.config.debug
  )
  return response.data.Xrg
}
