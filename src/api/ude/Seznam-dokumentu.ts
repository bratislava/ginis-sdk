import { groupBy } from 'lodash'
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
  sanitizeParamBody,
} from '../../utils/request-util'
import { coercedArray } from '../../utils/validation'

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
export type UdeSeznamDokumentuRequest = {
  [K in (typeof seznamDokumentuRequestProperties)[number] as K]?: RequestParamType
}

const seznamDokumentuParamOrders: RequestParamOrder[] = [
  {
    name: 'Seznam-dokumentu',
    params: seznamDokumentuRequestProperties,
  },
]

/**
 * Manually typed according to https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=390&methodName=seznam-dokumentu&type=response#
 */
const seznamDokumentuSchema = z.object({
  'Id-zaznamu': z.string(),
  /**
   * pripraveno - Připraveno – schváleno k vyvěšení, ale ještě nenastalo datum vyvěšení. Záznamy s touto hodnotou se na výstupu mohou objevit pouze u desek, které vrací v metodě seznam-desek element Stav-pripraveno = 'true'.
   * vyveseno - Vyvěšeno – schváleno k vyvěšení + nastalo datum vyvěšení (a ještě nenastalo datum sejmutí)
   * sejmuto - Sejmuto – záznam byl na desce, ale už nastalo datum sejmutí a nebo byl ručně sejmut (a do okamžiku ručního sejmutí se posunulo datum sejmutí)
   */
  Stav: z.string().optional(),
  /**
   * Název kategorie.
   */
  Kategorie: z.string(),
  Nazev: z.string(),
  Popis: z.string().optional(),
  /**
   * ISO-string date
   */
  'Vyveseno-dne': z.string(),
  /**
   * ISO-string date
   */
  'Sejmuto-dne': z.string().optional(),
  Zdroj: z.string(),
  /**
   * Identifikace GINIS funkce, která navrhla dokument k vyvěšení.
   */
  'Id-fun-navrhl': z.string(),
  /**
   * Osoba, která navrhla dokument k vyvěšení.
   */
  Navrhl: z.string(),
  /**
   * Identifikace GINIS funkce, která dokument schválila resp. vyvěsila.
   */
  'Id-fun-schvalil': z.string(),
  /**
   * Osoba, která dokument schválila resp. vyvěsila.
   */
  Schvalil: z.string(),
  /**
   * Číslo jednací resp. značka.
   */
  Cj: z.string().optional(),
  /**
   * Počet vyvěšených souborů.
   * int
   */
  'Pocet-souboru': z.string(),
  /**
   * Identifikace GINIS dokumentu. Vráceno v případě, že byl záznam vyvěšen zveřejněním el. obrazu nebo příloh z GINIS dokumentu.
   */
  'Id-dokumentu': z.string().optional(),
  /**
   * Celkový počet vyvěšených dokumentů/záznamů.
   * int
   */
  'Pocet-vyveseno': z.string(),
  /**
   * Celkový počet dokumentů/záznamů v archivu (sejmutých).
   * int
   */
  'Pocet-archiv': z.string(),
  /**
   * Datum a čas změny záznamu na úřední desce.
   * dateTime
   */
  'Datum-zmeny': z.string(),
  'Puvod-dokumentu': z.string().optional(),
  'Odesilatel-dokumentu': z.string().optional(),
  'Typ-dokumentu': z.string().optional(),
  'El-obraz-podpis': z.string().optional(),
  'Cj-spisu': z.string().optional(),
  'Cislo-sml': z.string().optional(),
  'Typ-sml': z.string().optional(),
  'Nazev-sml': z.string().optional(),
  'Subjekt-sml': z.string().optional(),
  'Nazev-sub-sml': z.string().optional(),
  'Prijmeni-sub-sml': z.string().optional(),
  'Jmeno-sub-sml': z.string().optional(),
  'Ico-sub-sml': z.string().optional(),
  'Obec-sub-sml': z.string().optional(),
  'Ulice-sub-sml': z.string().optional(),
  'Cor-sub-sml': z.string().optional(),
  'Cpop-sub-sml': z.string().optional(),
  'Psc-sub-sml': z.string().optional(),
  'Typ-sub-sml': z.string().optional(),
  'Datum-uzavreni-sml': z.string().optional(),
  'Odbor-sml': z.string().optional(),
  'Celkova-castka-sml': z.string().optional(),
  'Mena-sml': z.string().optional(),
})

const dokumentySchema = z.object({
  'Id-zaznamu': z.string().optional(),
  'Datum-zmeny': z.string().optional(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-dokumentu&type=response
const seznamDokumentuResponseSchema = z.object({
  'Seznam-dokumentu': coercedArray(seznamDokumentuSchema),
  'Sejmute-dokumenty': coercedArray(dokumentySchema),
  'Zrusene-dokumenty': coercedArray(dokumentySchema),
})

export type UdeSeznamDokumentuSeznamDokumentuItem = z.infer<typeof seznamDokumentuSchema>
export type UdeSeznamDokumentuSejmuteDokumentyItem = z.infer<typeof dokumentySchema>
// for consistency of the API
// eslint-disable-next-line sonarjs/redundant-type-aliases
export type UdeSeznamDokumentuZruseneDokumentyItem = UdeSeznamDokumentuSejmuteDokumentyItem
export type UdeSeznamDokumentuResponse = z.infer<typeof seznamDokumentuResponseSchema>

export async function seznamDokumentu(
  this: Ginis,
  bodyObj: UdeSeznamDokumentuRequest
): Promise<UdeSeznamDokumentuResponse> {
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
      paramsBodies: [bodyObj],
      paramOrders: seznamDokumentuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, seznamDokumentuResponseSchema)
}

/**
 * Gets the record ids with the latest archive date for one given document.
 * All records shall have the same document id.
 *
 * @param records array of records to filter belonging to the same document
 * @returns array of record ids with the latest archive date
 */
function getRecordIdsWithLatestArchiveDate(
  records: UdeSeznamDokumentuSeznamDokumentuItem[]
): string[] {
  let latestDate: Date | null = null
  const latestArchivedIds: string[] = []

  for (const record of records) {
    const dateStr = record['Sejmuto-dne']
    if (!dateStr) {
      // even active records should have an archive date, just set in future
      // if there is no date, the whole document seems to be corrupt and it's safer to ignore it
      return []
    }

    const date = new Date(dateStr)
    if (!latestDate || date.getTime() > latestDate.getTime()) {
      // Found a newer date, reset and start collecting
      latestDate = date
      latestArchivedIds.splice(0)
      latestArchivedIds.push(record['Id-zaznamu'])
    } else if (date.getTime() === latestDate.getTime()) {
      // Same date as latest, add to collection
      latestArchivedIds.push(record['Id-zaznamu'])
    }
    // If date is older, skip it
  }

  return latestArchivedIds
}

/**
 * Filters out records that are replaced by newer versions.
 * Keeps only the latest version of each record.
 * @param allRecords array of records to filter
 * @returns set of record ids that are the latest versions in their document
 */
function filterOutReplacedRecords(
  allRecords: UdeSeznamDokumentuSeznamDokumentuItem[]
): Set<string> {
  const latestVersionRecordIds = new Set<string>()

  const groupedByDocumentId = groupBy(allRecords, (doc) => doc['Id-dokumentu'] || doc['Id-zaznamu'])
  for (const records of Object.values(groupedByDocumentId)) {
    if (records.length === 0) {
      continue
    }

    getRecordIdsWithLatestArchiveDate(records).forEach((recordId) =>
      latestVersionRecordIds.add(recordId)
    )
  }
  return latestVersionRecordIds
}

export async function seznamDokumentuFilterArchiv(
  this: Ginis,
  bodyObj: UdeSeznamDokumentuRequest
): Promise<UdeSeznamDokumentuResponse> {
  const sanitizedParams = sanitizeParamBody(bodyObj)
  // eslint-disable-next-line dot-notation
  const requestedState = sanitizedParams['Stav']?.value

  if (requestedState === 'vyveseno') {
    throw new GinisError(
      'GINIS SDK Error: Invalid request parameters. "Stav" cannot be "vyveseno".'
    )
  }

  // period when published records could be replaced by newer versions
  const CHANGES_EXPECTED_MONTHS = 1
  const publishedUntil = sanitizedParams['Vyveseno-od-horni-mez']?.value
  let changeCutoffDate: string | undefined = undefined
  if (publishedUntil) {
    const date = new Date(publishedUntil)
    date.setMonth(date.getMonth() + CHANGES_EXPECTED_MONTHS)
    changeCutoffDate = date.toISOString().split('T')[0]
  }

  // Fetch all archived and non-archived records
  const data = await this.ude.seznamDokumentu({
    ...bodyObj,
    Stav: undefined,
    'Vyveseno-od-horni-mez': changeCutoffDate,
  })

  const allRecords = data['Seznam-dokumentu']

  const latestVersionRecordIds = filterOutReplacedRecords(allRecords)

  const filteredRecords = allRecords.filter((record) => {
    // apply original published date filter
    if (publishedUntil && record['Vyveseno-dne'] > publishedUntil) {
      return false
    }
    // apply original state filter
    if (requestedState && record.Stav !== requestedState) {
      return false
    }

    // filter out replaced records keeping only the latest versions of each record
    return latestVersionRecordIds.has(record['Id-zaznamu'])
  })

  return { ...data, 'Seznam-dokumentu': filteredRecords }
}
