import { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

/**
 * Full docs: https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=390&methodName=seznam-dokumentu&type=request
 */
const seznamDokumentuRequestProperties = [
  /**
   * UDE - Vrátit pouze informace evidované v GINIS modulu Úřední deska. Tj. základní informace o vyvěšeném záznamu. Elementy: Id-zaznamu ... Id-dokumentu.
   * UDEWFL - Když byl záznam vyvěšen z GINIS modulu, jsou o něm dotaženy základní informace (další možno získat voláním XRG-SSL). Elementy: Id-zaznamu ... Id-dokumentu + Puvod-dokumentu ... Cj-spisu
   * UDESML - Když byl záznam vyvěšen z GINIS modulu SML, jsou o něm dotaženy informace. Elementy: Id-zaznamu ... Id-dokumentu + Cislo-sml ... Odbor-sml.
   * UDEWFLSML - Informace UDE + WFL + SML. Vrátí vše.
   */
  'Vratit-info',
  /**
   * vyveseno - vyvěšeno
   * sejmuto - sejmuto
   */
  'Stav',
  'Id-uredni-desky',
  'Id-kategorie',
  /**
   * ISO-string date format
   */
  'Vyveseno-od',
  /**
   * ISO-string date format
   */
  'Vyveseno-od-horni-mez',
  /**
   * ISO-string date format
   */
  'Sejmuto-od',
  /**
   * ISO-string date format
   */
  'Sejmuto-od-horni-mez',
  /**
   * Název záznamu. Hledáno přes LIKE "%hodnota%" bez ohledu na diakritiku a velikost písmen (na db stroji Informix s ohledem na diakritiku)
   * Max 254 chars
   */
  'Nazev',
  /**
   * Popis záznamu.  Hledáno přes LIKE "%hodnota%" bez ohledu na diakritiku a velikost písmen (na db stroji Informix s ohledem na diakritiku)
   * Max 254 chars
   */
  'Popis',
  'Zdroj',
  /**
   * rucni-evidence - ruční evidence
   * elektronicke-podani - elektronické podání
   * datova-schranka - datová schránka
   * interface-xrg - interface, xrg
   */
  'Puvod-dokumentu',
  'Odesilatel-dokumentu',
  'Cj-spisu',
  /**
   * ISO-string date-time format
   */
  'Datum-zmeny',
  /**
   * ISO-string date-time format
   */
  'Datum-zmeny-horni-mez',
  'Cislo-sml',
  'Typ-sml',
  'Nazev-sml',
  'Nazev-sub-sml',
  'Prijmeni-sub-sml',
  'Jmeno-sub-sml',
  'Ico-sub-sml',
  'Obec-sub-sml',
  'Ulice-sub-sml',
  'Cor-sub-sml',
  'Cpop-sub-sml',
  'Psc-sub-sml',
  'Typ-sub-sml',
  /**
   * ISO-string date-time format
   */
  'Datum-uzavreni-sml-od',
  /**
   * ISO-string date-time format
   */
  'Datum-uzavreni-sml-do',
  'Odbor-sml',
  'Celkova-castka-od-sml',
  'Celkova-castka-do-sml',
  'Mena-sml',
] as const

/**
 * Fields 'Datum-\*', 'Vyveseno-\*' and 'Sejmuto-\*' are ISO-string date-time format
 *
 * 'Vratit-info' - enum field:
 * UDE - Vrátit pouze informace evidované v GINIS modulu Úřední deska. Tj. základní informace o vyvěšeném záznamu. Elementy: Id-zaznamu ... Id-dokumentu.
 * UDEWFL - Když byl záznam vyvěšen z GINIS modulu, jsou o něm dotaženy základní informace (další možno získat voláním XRG-SSL). Elementy: Id-zaznamu ... Id-dokumentu + Puvod-dokumentu ... Cj-spisu
 * UDESML - Když byl záznam vyvěšen z GINIS modulu SML, jsou o něm dotaženy informace. Elementy: Id-zaznamu ... Id-dokumentu + Cislo-sml ... Odbor-sml.
 * UDEWFLSML - Informace UDE + WFL + SML. Vrátí vše.
 *
 * 'Stav' - enum field:
 * vyveseno - vyvěšeno
 * sejmuto - sejmuto
 *
 * 'Nazev' and 'Popis' - Max 254 chars - Hledáno přes LIKE "%hodnota%" bez ohledu na diakritiku a velikost písmen (na db stroji Informix s ohledem na diakritiku)
 *
 * 'Puvod-dokumentu' - enum field:
 * rucni-evidence - ruční evidence
 * elektronicke-podani - elektronické podání
 * datova-schranka - datová schránka
 * interface-xrg - interface, xrg
 */
export type SeznamDokumentuRequestBody = {
  [K in (typeof seznamDokumentuRequestProperties)[number] as K]?: string
}

/**
 * Manually typed according to https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=390&methodName=seznam-dokumentu&type=response#
 */
export type SeznamDokumentuResponseItem = {
  'Id-zaznamu': string
  /**
   * pripraveno - Připraveno – schváleno k vyvěšení, ale ještě nenastalo datum vyvěšení. Záznamy s touto hodnotou se na výstupu mohou objevit pouze u desek, které vrací v metodě seznam-desek element Stav-pripraveno = 'true'.
   * vyveseno - Vyvěšeno – schváleno k vyvěšení + nastalo datum vyvěšení (a ještě nenastalo datum sejmutí)
   * sejmuto - Sejmuto – záznam byl na desce, ale už nastalo datum sejmutí a nebo byl ručně sejmut (a do okamžiku ručního sejmutí se posunulo datum sejmutí)
   */
  Stav?: string
  /**
   * Název kategorie.
   */
  Kategorie: string
  Nazev: string
  Popis?: string
  /**
   * ISO-string date
   */
  'Vyveseno-dne': string
  /**
   * ISO-string date
   */
  'Sejmuto-dne'?: string
  Zdroj: string
  /**
   * Identifikace GINIS funkce, která navrhla dokument k vyvěšení.
   */
  'Id-fun-navrhl': string
  /**
   * Osoba, která navrhla dokument k vyvěšení.
   */
  Navrhl: string
  /**
   * Identifikace GINIS funkce, která dokument schválila resp. vyvěsila.
   */
  'Id-fun-schvalil': string
  /**
   * Osoba, která dokument schválila resp. vyvěsila.
   */
  Schvalil: string
  /**
   * Číslo jednací resp. značka.
   */
  Cj?: string
  /**
   * Počet vyvěšených souborů.
   * int
   */
  'Pocet-souboru': string
  /**
   * Identifikace GINIS dokumentu. Vráceno v případě, že byl záznam vyvěšen zveřejněním el. obrazu nebo příloh z GINIS dokumentu.
   */
  'Id-dokumentu'?: string
  /**
   * Celkový počet vyvěšených dokumentů/záznamů.
   * int
   */
  'Pocet-vyveseno': string
  /**
   * Celkový počet dokumentů/záznamů v archivu (sejmutých).
   * int
   */
  'Pocet-archiv': string
  /**
   * Datum a čas změny záznamu na úřední desce.
   * dateTime
   */
  'Datum-zmeny': string
  'Puvod-dokumentu'?: string
  'Odesilatel-dokumentu'?: string
  'Typ-dokumentu'?: string
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

export type DokumentyResponseItem = {
  'Id-zaznamu'?: string
  'Datum-zmeny'?: string
}

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-dokumentu&type=response
export interface SeznamDokumentuResponseXrg {
  ixsExt: string
  'Seznam-dokumentu'?: SeznamDokumentuResponseItem | SeznamDokumentuResponseItem[]
  'Sejmute-dokumenty'?: DokumentyResponseItem | DokumentyResponseItem[]
  'Zrusene-dokumenty'?: DokumentyResponseItem | DokumentyResponseItem[]
}

export async function seznamDokumentu(
  this: Ginis,
  bodyObj: SeznamDokumentuRequestBody
): Promise<SeznamDokumentuResponseXrg> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const requestName = 'Seznam-dokumentu'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ude/seznam-dokumentu/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: seznamDokumentuRequestProperties,
    }),
    this.config.debug
  )
  return extractResponseJson<SeznamDokumentuResponseXrg>(response.data, requestName)
}
