import { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=524&methodName=detail-dokumentu&type=request#
const detailDokumentuRequestProperties = ['Vratit-info', 'Id-zaznamu'] as const

type DetailDokumentuRequestBody = {
  [K in (typeof detailDokumentuRequestProperties)[number] as K]?: string
}

/** These types were created manually:
 * - copied from https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=524&methodName=detail-dokumentu&type=response
 * - typed all fields as string
 * - marked all fields as optional
 * - manually checked which fields are required and changed them to required
 * - manually check type and add TSDoc comments for each field
 */
type DetailDokumentuResponseItem = {
  'Id-zaznamu': string
  Stav?: string
  Kategorie: string
  Nazev: string
  Popis?: string
  Poznamka?: string
  /**
   * date
   */
  'Vyveseno-dne': string
  /**
   * date
   */
  'Sejmuto-dne'?: string
  Zdroj: string
  'Id-fun-navrhl': string
  Navrhl: string
  'Id-fun-schvalil': string
  Schvalil: string
  Cj?: string
  /**
   * Počet vyvěšených souborů.
   * int
   */
  'Pocet-souboru': string
  'Id-dokumentu'?: string
  /**
   * Datum a čas změny záznamu na úřední desce (změna nastala po tomto okamžiku).
   * dateTime
   */
  'Datum-zmeny': string
  'Puvod-dokumentu'?: string
  'Odesilatel-dokumentu'?: string
  'Typ-dokumentu'?: string
  /**
   * Příznak, zda je elektronický obraz podepsán. Vráceno v případě, že byl záznam vyvěšen zveřejněním el. obrazu nebo příloh z GINIS dokumentu.
   * int
   *
   * 0 - Soubor není elektronicky podepsán.
   * 1 - Soubor je elektronicky podepsán.
   * 2 - Soubor je elektronicky podepsán čas. razítkem.
   * 3 - Dokument je opatřen čas. razítkem.
   */
  'El-obraz-podpis'?: string
  'Cj-spisu'?: string
  'Cislo-sml'?: string
  'Typ-sml'?: string
  'Nazev-sml'?: string
  'Subjekt-sml'?: string
  'Nazev-sub-sml'?: string
  'Prijmeni-sub-sml'?: string
  'Jmeno-sub-sml'?: string
  'Ico-sub-sml'?: string
  'Obec-sub-sml'?: string
  'Ulice-sub-sml'?: string
  'Cor-sub-sml'?: string
  'Cpop-sub-sml'?: string
  'Psc-sub-sml'?: string
  'Typ-sub-sml'?: string
  'Datum-uzavreni-sml'?: string
  'Odbor-sml'?: string
  'Celkova-castka-sml'?: string
  'Mena-sml'?: string
}

type SouboryDokumentuResponseItem = {
  'Id-souboru': string
  Nazev: string
  /**
   * Velikost souboru včetně jednotky (např. KB).
   * string
   */
  Velikost?: string
  /**
   * Příznak, zda se jedná o el. obraz GINIS dokumentu. Informace je k dispozici u záznamů vyvěšených přes GINIS v. 364 a vyšší.
   * short
   *
   * 0 - Soubor není el. obraz GINIS dokumentu (soubor je příloha, nebo vložen přes modul UDA01).
   * 1 - Soubor je el. obraz GINIS dokumentu.
   */
  'Priznak-el-obr'?: string
  /**
   * Poznámka k souboru.
   */
  Poznamka?: string
  /**
   * Příznak, zda je soubor el. podepsán. Vráceno v případě, že byl záznam vyvěšen zveřejněním el. obrazu nebo příloh z GINIS dokumentu.
   * short
   *
   * 0 - Soubor není elektronicky podepsán.
   * 1 - Soubor je elektronicky podepsán.
   * 2 - Soubor je elektronicky podepsán čas. razítkem.
   * 3 - Dokument je opatřen čas. razítkem.
   */
  'Priznak-podpis'?: string
}

type ProtistranySmlResponseItem = {
  'Typ-protistrany'?: string
  Subjekt?: string
  'Nazev-sub'?: string
  'Prijmeni-sub'?: string
  'Jmeno-sub'?: string
  'Ico-sub'?: string
  'Obec-sub'?: string
  'Ulice-sub'?: string
  'Cor-sub'?: string
  'Cpop-sub'?: string
  'Psc-sub'?: string
  /**
   * Typ subjektu smlouvy.
   *
   * neurceno - Neurčeno
   * pravnicka-osoba - Právnická osoba
   * fyz-osoba - Fyzická osoba
   * fyz-osoba-osvc - Fyzická osoba OSVČ
   */
  'Typ-sub'?: string
}

/**
 * Note:
 * - DetailDokumentu usually comes as an array with one item
 * - SouboryDokumentu usually comes as play item it there is only one file, array otherwise
 */
export type DetailDokumentuResponseXrg = {
  ixsExt: string
  'Detail-dokumentu'?: DetailDokumentuResponseItem
  'Soubory-dokumentu'?: SouboryDokumentuResponseItem | SouboryDokumentuResponseItem[]
  'Protistrany-sml'?: ProtistranySmlResponseItem | ProtistranySmlResponseItem[]
}

export async function detailDokumentu(
  this: Ginis,
  bodyObj: DetailDokumentuRequestBody
): Promise<DetailDokumentuResponseXrg> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const requestName = 'Detail-dokumentu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ude/detail-dokumentu/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: detailDokumentuRequestProperties,
    }),
    this.config.debug
  )
  return await extractResponseJson<DetailDokumentuResponseXrg>(response.data, requestName)
}
