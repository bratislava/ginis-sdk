import { z } from 'zod'

import { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
} from '../../utils/request-util'
import { coercedArray } from '../../utils/validation'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=524&methodName=detail-dokumentu&type=request#
const detailDokumentuRequestProperties = ['Vratit-info', 'Id-zaznamu'] as const

type DetailDokumentuRequest = {
  [K in (typeof detailDokumentuRequestProperties)[number] as K]?: string
}

/** These types were created manually:
 * - copied from https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=524&methodName=detail-dokumentu&type=response
 * - typed all fields as string
 * - marked all fields as optional
 * - manually checked which fields are required and changed them to required
 * - manually check type and add TSDoc comments for each field
 */
const detailDokumentuSchema = z.object({
  'Id-zaznamu': z.string(),
  Stav: z.string().optional(),
  Kategorie: z.string(),
  Nazev: z.string(),
  Popis: z.string().optional(),
  Poznamka: z.string().optional(),
  /**
   * date
   */
  'Vyveseno-dne': z.string(),
  /**
   * date
   */
  'Sejmuto-dne': z.string().optional(),
  Zdroj: z.string(),
  'Id-fun-navrhl': z.string(),
  Navrhl: z.string(),
  'Id-fun-schvalil': z.string(),
  Schvalil: z.string(),
  Cj: z.string().optional(),
  /**
   * Počet vyvěšených souborů.
   * int
   */
  'Pocet-souboru': z.string(),
  'Id-dokumentu': z.string().optional(),
  /**
   * Datum a čas změny záznamu na úřední desce (změna nastala po tomto okamžiku).
   * dateTime
   */
  'Datum-zmeny': z.string(),
  'Puvod-dokumentu': z.string().optional(),
  'Odesilatel-dokumentu': z.string().optional(),
  'Typ-dokumentu': z.string().optional(),
  /**
   * Příznak, zda je elektronický obraz podepsán. Vráceno v případě, že byl záznam vyvěšen zveřejněním el. obrazu nebo příloh z GINIS dokumentu.
   * int
   *
   * 0 - Soubor není elektronicky podepsán.
   * 1 - Soubor je elektronicky podepsán.
   * 2 - Soubor je elektronicky podepsán čas. razítkem.
   * 3 - Dokument je opatřen čas. razítkem.
   */
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

const souboryDokumentuSchema = z.object({
  'Id-souboru': z.string(),
  Nazev: z.string(),
  /**
   * Velikost souboru včetně jednotky (např. KB).
   * string
   */
  Velikost: z.string().optional(),
  /**
   * Příznak, zda se jedná o el. obraz GINIS dokumentu. Informace je k dispozici u záznamů vyvěšených přes GINIS v. 364 a vyšší.
   * short
   *
   * 0 - Soubor není el. obraz GINIS dokumentu (soubor je příloha, nebo vložen přes modul UDA01).
   * 1 - Soubor je el. obraz GINIS dokumentu.
   */
  'Priznak-el-obr': z.string().optional(),
  /**
   * Poznámka k souboru.
   */
  Poznamka: z.string().optional(),
  /**
   * Příznak, zda je soubor el. podepsán. Vráceno v případě, že byl záznam vyvěšen zveřejněním el. obrazu nebo příloh z GINIS dokumentu.
   * short
   *
   * 0 - Soubor není elektronicky podepsán.
   * 1 - Soubor je elektronicky podepsán.
   * 2 - Soubor je elektronicky podepsán čas. razítkem.
   * 3 - Dokument je opatřen čas. razítkem.
   */
  'Priznak-podpis': z.string().optional(),
})

const protistranySmlSchema = z.object({
  'Typ-protistrany': z.string().optional(),
  Subjekt: z.string().optional(),
  'Nazev-sub': z.string().optional(),
  'Prijmeni-sub': z.string().optional(),
  'Jmeno-sub': z.string().optional(),
  'Ico-sub': z.string().optional(),
  'Obec-sub': z.string().optional(),
  'Ulice-sub': z.string().optional(),
  'Cor-sub': z.string().optional(),
  'Cpop-sub': z.string().optional(),
  'Psc-sub': z.string().optional(),
  /**
   * Typ subjektu smlouvy.
   *
   * neurceno - Neurčeno
   * pravnicka-osoba - Právnická osoba
   * fyz-osoba - Fyzická osoba
   * fyz-osoba-osvc - Fyzická osoba OSVČ
   */
  'Typ-sub': z.string().optional(),
})

/**
 * Note:
 * - DetailDokumentu usually comes as an array with one item
 * - SouboryDokumentu usually comes as play item it there is only one file, array otherwise
 */
const DetailDokumentuResponseSchema = z.object({
  'Detail-dokumentu': detailDokumentuSchema.optional(),
  'Soubory-dokumentu': coercedArray(souboryDokumentuSchema),
  'Protistrany-sml': coercedArray(protistranySmlSchema),
})

export type DetailDokumentuResponse = z.infer<typeof DetailDokumentuResponseSchema>

export async function detailDokumentu(
  this: Ginis,
  bodyObj: DetailDokumentuRequest
): Promise<DetailDokumentuResponse> {
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
  return await extractResponseJson(response.data, requestName, DetailDokumentuResponseSchema)
}
