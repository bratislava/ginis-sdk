import type { Ginis } from '../../../ginis'
import { makeAxiosRequest, getGRestHeader, GRestHeader } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-funkcniho-mista&type=request
export type DetailFunkcnihoMistaRequest = {
  'Id-funkce': string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-funkcniho-mista&type=response
export interface DetailFunkcnihoMistaXrg {
  Atribut_Xrg_ixsExt?: string
  DetailFunkcnihoMista: {
    'Id-funkce': string
    Aktivita: string
    Nazev?: string
    Zkratka?: string
    'Oficialni-nazev'?: string
    Poznamka?: string
    'Datum-od': string
    'Datum-do': string
    'Id-spisoveho-uzlu': string
    'Nazev-spisoveho-uzlu'?: string
    'Zkratka-spisoveho-uzlu'?: string
    'Uroven-funkce': string
    'Kod-funkce'?: string
    'Id-nad'?: string
    'Id-referenta': string
    'Nazev-referenta'?: string
    'Id-orj': string
    'Nazev-orj'?: string
    'Kod-mistnosti'?: string
    Url?: string
    Mail?: string
    Telefon?: string
    Fax?: string
    'Datum-zmena': string
  }
}
export type DetailFunkcnihoMistaResponse = {
  GRestHeader: GRestHeader
  Xrg: DetailFunkcnihoMistaXrg
}

export async function detailFunkcnihoMista(
  this: Ginis,
  bodyObj: DetailFunkcnihoMistaRequest
): Promise<DetailFunkcnihoMistaXrg> {
  const url = this.config.urls.gin
  if (!url) throw new GinisError('GINIS SDK Error: Missing GIN url in GINIS config')
  const response = await makeAxiosRequest<DetailFunkcnihoMistaResponse>(
    undefined,
    `${url}/json/Detail-funkcniho-mista`,
    {
      GRestHeader: getGRestHeader(
        this.config,
        'http://www.gordic.cz/xrg/detail-funkcniho-mista/request/v_1.0.0.0'
      ),
      Xrg: { 'Detail-funkcniho-mista': bodyObj },
    },
    this.config.debug
  )
  return response.data.Xrg
}
