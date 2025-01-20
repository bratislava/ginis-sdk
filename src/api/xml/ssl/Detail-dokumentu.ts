import type { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-dokumentu&type=request
const detailDokumentuRequestProperties = [
  'Id-dokumentu',
  'Vyradit-historii',
  'Vyradit-obsah-spisu',
  'Vyradit-prilohy',
  'Vyradit-souvisejici',
  'Id-esu',
  'Vyradit-doruceni',
  'Id-eu',
] as const

export type DetailDokumentuRequest = {
  [K in (typeof detailDokumentuRequestProperties)[number] as K]?: string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-dokumentu&type=response
export interface DetailDokumentuXrg {
  ixsExt?: string
  'Wfl-dokument': WflDokumentResponseItem
  Doruceni?: DoruceniResponseItem
  'E-doruceni'?: EDoruceniResponseItem
  'Historie-dokumentu'?: HistorieDokumentuResponseItem | HistorieDokumentuResponseItem[]
  'Ssl-dokument'?: SslDokumentResponseItem
  'Ssl-spis'?: SslSpisResponseItem
  'Ssl-obsah-spis'?: SslObsahSpisResponseItem | SslObsahSpisResponseItem[]
  'Cj-dokumentu'?: CjDokumentuResponseItem
  'Prilohy-dokumentu'?: PrilohyDokumentuResponseItem | PrilohyDokumentuResponseItem[]
  'Souvisejici-dokumenty'?: SouvisejiciDokumentyResponseItem | SouvisejiciDokumentyResponseItem[]
  Spisovna?: SpisovnaResponseItem | SpisovnaResponseItem[]
  'Vlozeno-do-spisu'?: VlozenoDoSpisuResponseItem
}

type WflDokumentResponseItem = {
  'Id-dokumentu': string
  'Id-spisu': string
  'Priznak-spisu': string
  'Priznak-cj': string
  'Id-funkce-vlastnika': string
  Vec?: string
  Znacka?: string
  'Stav-distribuce': string
  'Stav-dokumentu': string
  'Id-agendy': string
  'Id-typu-dokumentu': string
  'Priznak-doruceni': string
  'Priznak-evidence-ssl': string
  'Misto-vzniku'?: string
  'Datum-podani': string
  'Priznak-fyz-existence': string
  'Priznak-el-obrazu': string
  'Id-souboru'?: string
  'Jmeno-souboru'?: string
  'Popis-souboru'?: string
  'Datum-zmeny': string
  'Id-zmenu-provedl': string
  'Id-originalu'?: string
  'Verze-souboru'?: string
  'Datum-zmeny-souboru'?: string
  'Velikost-souboru'?: string
  Barcode?: string
  'Priznak-souboru-ro'?: string
}
type DoruceniResponseItem = {
  'Id-dokumentu': string
  Stat?: string
  Psc?: string
  'Datum-odeslani'?: string
  'Znacka-odesilatele'?: string
  'Datum-ze-dne'?: string
  'Podaci-cislo'?: string
  'Zpusob-doruceni'?: string
  'Druh-zasilky': string
  'Druh-zachazeni': string
  'Datum-prijmu-podani'?: string
  'Id-odesilatele'?: string
  'Pocet-listu'?: string
  'Pocet-priloh'?: string
  'Pocet-stran'?: string
  'Pocet-kopii'?: string
  'Pocet-listu-priloh'?: string
  'Poznamka-k-doruceni'?: string
  'Id-uzlu-podani'?: string
  'Poradove-cislo-podani': string
}
type EDoruceniResponseItem = {
  'Datum-prijeti'?: string
  'Datum-doruceni'?: string
  'Id-ds-odesilatele': string
}
type HistorieDokumentuResponseItem = {
  'Id-dokumentu': string
  'Text-zmeny'?: string
  Poznamka?: string
  'Datum-zmeny': string
  'Id-zmenu-provedl': string
  'Id-ktg-zmeny': string
}
type SslDokumentResponseItem = {
  'Id-dokumentu': string
  'Id-spisoveho-planu'?: string
  'Id-spisoveho-znaku'?: string
  'Skartacni-znak'?: string
  'Skartacni-lhuta'?: string
  Pristup?: string
  'Id-stupne-utajeni'?: string
  'Vec-podrobne'?: string
  Poznamka?: string
  'Pocet-listu'?: string
  'Pocet-priloh'?: string
  'Pocet-stran'?: string
  'Pocet-kopii'?: string
  'Pocet-listu-priloh'?: string
  'Id-umisteni'?: string
  Umisteni?: string
  'Id-funkce-resitele'?: string
  'Datum-ulozeni'?: string
  'Datum-pravni-moci'?: string
  'Datum-vykonatelnosti'?: string
}
type SslSpisResponseItem = {
  'Id-spisu': string
  'Id-zpusob-vyrizeni'?: string
  'Poznamka-k-vyrizeni'?: string
  'Datum-vyrizeni'?: string
  'Id-funkce-vyrizovatele'?: string
  'Id-funkce-schvalovatele'?: string
  'Datum-uzavreni'?: string
  'Id-funkce-uzaviratele'?: string
  'Datum-pravni-moci'?: string
  'Datum-vyrizeni-do'?: string
  'Denik-spisu': string
  'Rok-spisu': string
  'Poradove-cislo-spisu': string
  'Doplnek-cj'?: string
}
type SslObsahSpisResponseItem = {
  'Id-spisu': string
  'Id-vlozeneho-dokumentu': string
  'Poradove-cislo'?: string
  'Datum-vlozeni'?: string
  'Datum-vyjmuti'?: string
  'Vztah-ke-spisu'?: string
  Aktivita: string
  'Poradove-cislo-uziv'?: string
  Poznamka?: string
}
type CjDokumentuResponseItem = {
  'Id-init-dokumentu': string
  'Id-vyriz-dokumentu'?: string
  'Denik-cj': string
  'Rok-cj': string
  'Poradove-cislo-cj': string
  'Vec-cj'?: string
  'Znacka-cj': string
  'Stav-cj': string
  'Datum-evidence': string
  'Datum-vyrizeni-do'?: string
  'Datum-vyrizeni'?: string
  'Datum-vlozeni'?: string
  'Datum-vyjmuti'?: string
  'Id-zpusob-vyrizeni'?: string
  'Doplnek-cj'?: string
}
type PrilohyDokumentuResponseItem = {
  'Poradove-cislo': string
  Titulek?: string
  Popis?: string
  Poznamka?: string
  'Priznak-el-obrazu': string
  'Id-souboru'?: string
  'Verze-souboru'?: string
  'Datum-zmeny-souboru'?: string
  'Jmeno-souboru'?: string
  'Velikost-souboru'?: string
  'Ke-zverejneni'?: string
  'Stav-anonymizace'?: string
  'Kategorie-prilohy': string
  'Kategorie-prilohy-txt'?: string
  'Priznak-souboru-ro'?: string
}
type SouvisejiciDokumentyResponseItem = {
  'Typ-vazby': string
  'Id-dokumentu': string
  Poznamka?: string
  'Id-agendy': string
}
type SpisovnaResponseItem = {
  'Stav-ulozeni-kod': string
  'Stav-ulozeni': string
  'Datum-skartace'?: string
  'Id-archivu-nda'?: string
}
type VlozenoDoSpisuResponseItem = {
  'Id-spisu': string
  'Poradove-cislo'?: string
  'Poradove-cislo-uziv'?: string
  Poznamka?: string
}

export async function detailDokumentu(
  this: Ginis,
  bodyObj: DetailDokumentuRequest
): Promise<DetailDokumentuXrg> {
  const url = this.config.urls.ssl
  if (!url) throw new GinisError('GINIS SDK Error: Missing SSL url in GINIS config')

  const requestName = 'Detail-dokumentu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ssl/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ssl/wfl-dokument/detail-dokumentu/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: detailDokumentuRequestProperties,
    }),
    this.config.debug
  )
  return extractResponseJson<DetailDokumentuXrg>(response.data, requestName)
}
