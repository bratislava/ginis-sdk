import { Ginis } from '../../../ginis'
import { makeAxiosRequest } from '../../../utils/api'
import { GinisError } from '../../../utils/errors'
import { createXmlRequestBody, createXmlRequestConfig, extractResponseJson } from '../request-util'

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=524&methodName=detail-dokumentu&type=request#
const seznamKategoriiRequestProperties = [
  // Identifikátor úřední desky. Pokud je v GINIS naadministrována jen jedna deska, nemusí být uvedeno.
  'Id-uredni-desky',
] as const

/**
 * 'Id-uredni-desky' - Identifikátor úřední desky. Pokud je v GINIS naadministrována jen jedna deska, nemusí být uvedeno.
 */
type SeznamKategoriiRequestBody = {
  [K in (typeof seznamKategoriiRequestProperties)[number] as K]?: string
}

type SeznamKategoriiResponseItem = {
  'Id-kategorie': string
  Nazev?: string
  /**
   * Počet vyvěšených dokumentů/záznamů v této kategorii.
   * int
   */
  'Pocet-vyveseno': string
  /**
   * Počet dokumentů/záznamů v archivu (sejmutých) této kategorie.
   * int
   */
  'Pocet-archiv': string
}

export type SeznamKategoriiResponseXrg = {
  ixsExt: string
  /**
   * Seznam-kategorii - vyžadován: Ne , max. výskyt: neomezeně
   */
  'Seznam-kategorii'?: SeznamKategoriiResponseItem | SeznamKategoriiResponseItem[]
}

export async function seznamKategorii(
  this: Ginis,
  bodyObj: SeznamKategoriiRequestBody
): Promise<SeznamKategoriiResponseXrg> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const requestName = 'Seznam-kategorii'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'

  const response = await makeAxiosRequest<string>(
    createXmlRequestConfig(requestName, requestNamespace),
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ude/seznam-kategorii/request/v_1.0.0.0',
      paramsBody: bodyObj,
      paramOrder: seznamKategoriiRequestProperties,
    }),
    this.config.debug
  )
  return extractResponseJson<SeznamKategoriiResponseXrg>(response.data, requestName)
}
