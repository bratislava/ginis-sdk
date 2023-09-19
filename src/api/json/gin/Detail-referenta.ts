import type { Ginis } from '../../../ginis'
import { makeAxiosRequest, getGRestHeader, GRestHeader } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-referenta&type=request
export type DetailReferentaRequest = {
  'Id-osoby': string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-referenta&type=response
export type DetailReferentaXrg = {
  Atribut_Xrg_ixsExt?: string
  DetailReferenta: {
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
  }
}

export type DetailReferentaResponse = {
  GRestHeader: GRestHeader
  Xrg: DetailReferentaXrg
}

export async function detailReferenta(
  this: Ginis,
  bodyObj: DetailReferentaRequest
): Promise<DetailReferentaXrg> {
  const url = this.config.urls.gin
  if (!url) throw new GinisError('GINIS SDK Error: Missing GIN url in GINIS config')
  const response = await makeAxiosRequest<DetailReferentaResponse>(
    undefined,
    `${url}/json/Detail-referenta`,
    {
      GRestHeader: getGRestHeader(
        this.config,
        'http://www.gordic.cz/xrg/detail-referenta/request/v_1.0.0.0'
      ),
      Xrg: { 'Detail-referenta': bodyObj },
    },
    this.config.debug
  )
  return response.data.Xrg
}
