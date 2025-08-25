import { z } from 'zod'

import type { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
  RequestParamOrder,
  RequestParamType,
} from '../../utils/request-util'
import { coercedArray } from '../../utils/validation'

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

export type SslDetailDokumentuRequest = {
  [K in (typeof detailDokumentuRequestProperties)[number] as K]?: RequestParamType
}

const detailDokumentuParamOrders: RequestParamOrder[] = [
  {
    name: 'Detail-dokumentu',
    params: detailDokumentuRequestProperties,
  },
]

const wflDokumentSchema = z.object({
  'Id-dokumentu': z.string(),
  'Id-spisu': z.string(),
  'Priznak-spisu': z.string(),
  'Priznak-cj': z.string(),
  'Id-funkce-vlastnika': z.string(),
  Vec: z.string().optional(),
  Znacka: z.string().optional(),
  'Stav-distribuce': z.string(),
  'Stav-dokumentu': z.string(),
  'Id-agendy': z.string(),
  'Id-typu-dokumentu': z.string(),
  'Priznak-doruceni': z.string(),
  'Priznak-evidence-ssl': z.string(),
  'Misto-vzniku': z.string().optional(),
  'Datum-podani': z.string(),
  'Priznak-fyz-existence': z.string(),
  'Priznak-el-obrazu': z.string(),
  'Id-souboru': z.string().optional(),
  'Jmeno-souboru': z.string().optional(),
  'Popis-souboru': z.string().optional(),
  'Datum-zmeny': z.string(),
  'Id-zmenu-provedl': z.string(),
  'Id-originalu': z.string().optional(),
  'Verze-souboru': z.string().optional(),
  'Datum-zmeny-souboru': z.string().optional(),
  'Velikost-souboru': z.string().optional(),
  Barcode: z.string().optional(),
  'Priznak-souboru-ro': z.string().optional(),
})
const doruceniSchema = z.object({
  'Id-dokumentu': z.string(),
  Stat: z.string().optional(),
  Psc: z.string().optional(),
  'Datum-odeslani': z.string().optional(),
  'Znacka-odesilatele': z.string().optional(),
  'Datum-ze-dne': z.string().optional(),
  'Podaci-cislo': z.string().optional(),
  'Zpusob-doruceni': z.string().optional(),
  'Druh-zasilky': z.string(),
  'Druh-zachazeni': z.string(),
  'Datum-prijmu-podani': z.string().optional(),
  'Id-odesilatele': z.string().optional(),
  'Pocet-listu': z.string().optional(),
  'Pocet-priloh': z.string().optional(),
  'Pocet-stran': z.string().optional(),
  'Pocet-kopii': z.string().optional(),
  'Pocet-listu-priloh': z.string().optional(),
  'Poznamka-k-doruceni': z.string().optional(),
  'Id-uzlu-podani': z.string().optional(),
  'Poradove-cislo-podani': z.string(),
})
const eDoruceniSchema = z.object({
  'Datum-prijeti': z.string().optional(),
  'Datum-doruceni': z.string().optional(),
  'Id-ds-odesilatele': z.string(),
})
const historieDokumentuSchema = z.object({
  'Id-dokumentu': z.string(),
  'Text-zmeny': z.string().optional(),
  Poznamka: z.string().optional(),
  'Datum-zmeny': z.string(),
  'Id-zmenu-provedl': z.string(),
  'Id-ktg-zmeny': z.string(),
})
const sslDokumentSchema = z.object({
  'Id-dokumentu': z.string(),
  'Id-spisoveho-planu': z.string().optional(),
  'Id-spisoveho-znaku': z.string().optional(),
  'Skartacni-znak': z.string().optional(),
  'Skartacni-lhuta': z.string().optional(),
  Pristup: z.string().optional(),
  'Id-stupne-utajeni': z.string().optional(),
  'Vec-podrobne': z.string().optional(),
  Poznamka: z.string().optional(),
  'Pocet-listu': z.string().optional(),
  'Pocet-priloh': z.string().optional(),
  'Pocet-stran': z.string().optional(),
  'Pocet-kopii': z.string().optional(),
  'Pocet-listu-priloh': z.string().optional(),
  'Id-umisteni': z.string().optional(),
  Umisteni: z.string().optional(),
  'Id-funkce-resitele': z.string().optional(),
  'Datum-ulozeni': z.string().optional(),
  'Datum-pravni-moci': z.string().optional(),
  'Datum-vykonatelnosti': z.string().optional(),
})
const sslSpisSchema = z.object({
  'Id-spisu': z.string(),
  'Id-zpusob-vyrizeni': z.string().optional(),
  'Poznamka-k-vyrizeni': z.string().optional(),
  'Datum-vyrizeni': z.string().optional(),
  'Id-funkce-vyrizovatele': z.string().optional(),
  'Id-funkce-schvalovatele': z.string().optional(),
  'Datum-uzavreni': z.string().optional(),
  'Id-funkce-uzaviratele': z.string().optional(),
  'Datum-pravni-moci': z.string().optional(),
  'Datum-vyrizeni-do': z.string().optional(),
  'Denik-spisu': z.string(),
  'Rok-spisu': z.string(),
  'Poradove-cislo-spisu': z.string(),
  'Doplnek-cj': z.string().optional(),
})
const sslObsahSpisSchema = z.object({
  'Id-spisu': z.string(),
  'Id-vlozeneho-dokumentu': z.string(),
  'Poradove-cislo': z.string().optional(),
  'Datum-vlozeni': z.string().optional(),
  'Datum-vyjmuti': z.string().optional(),
  'Vztah-ke-spisu': z.string().optional(),
  Aktivita: z.string(),
  'Poradove-cislo-uziv': z.string().optional(),
  Poznamka: z.string().optional(),
})
const cjDokumentuSchema = z.object({
  'Id-init-dokumentu': z.string(),
  'Id-vyriz-dokumentu': z.string().optional(),
  'Denik-cj': z.string(),
  'Rok-cj': z.string(),
  'Poradove-cislo-cj': z.string(),
  'Vec-cj': z.string().optional(),
  'Znacka-cj': z.string(),
  'Stav-cj': z.string(),
  'Datum-evidence': z.string(),
  'Datum-vyrizeni-do': z.string().optional(),
  'Datum-vyrizeni': z.string().optional(),
  'Datum-vlozeni': z.string().optional(),
  'Datum-vyjmuti': z.string().optional(),
  'Id-zpusob-vyrizeni': z.string().optional(),
  'Doplnek-cj': z.string().optional(),
})
const prilohyDokumentuSchema = z.object({
  'Poradove-cislo': z.string(),
  Titulek: z.string().optional(),
  Popis: z.string().optional(),
  Poznamka: z.string().optional(),
  'Priznak-el-obrazu': z.string(),
  'Id-souboru': z.string().optional(),
  'Verze-souboru': z.string().optional(),
  'Datum-zmeny-souboru': z.string().optional(),
  'Jmeno-souboru': z.string().optional(),
  'Velikost-souboru': z.string().optional(),
  'Ke-zverejneni': z.string().optional(),
  'Stav-anonymizace': z.string().optional(),
  'Kategorie-prilohy': z.string(),
  'Kategorie-prilohy-txt': z.string().optional(),
  'Priznak-souboru-ro': z.string().optional(),
})
const souvisejiciDokumentySchema = z.object({
  'Typ-vazby': z.string(),
  'Id-dokumentu': z.string(),
  Poznamka: z.string().optional(),
  'Id-agendy': z.string(),
})
const spisovnaSchema = z.object({
  'Stav-ulozeni-kod': z.string(),
  'Stav-ulozeni': z.string(),
  'Datum-skartace': z.string().optional(),
  'Id-archivu-nda': z.string().optional(),
})
const vlozenoDoSpisuSchema = z.object({
  'Id-spisu': z.string(),
  'Poradove-cislo': z.string().optional(),
  'Poradove-cislo-uziv': z.string().optional(),
  Poznamka: z.string().optional(),
})

// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-dokumentu&type=response
const detailDokumentuResponseSchema = z.object({
  'Wfl-dokument': wflDokumentSchema,
  Doruceni: doruceniSchema.optional(),
  'E-doruceni': eDoruceniSchema.optional(),
  'Historie-dokumentu': coercedArray(historieDokumentuSchema),
  'Ssl-dokument': sslDokumentSchema.optional(),
  'Ssl-spis': sslSpisSchema.optional(),
  'Ssl-obsah-spis': coercedArray(sslObsahSpisSchema),
  'Cj-dokumentu': cjDokumentuSchema.optional(),
  'Prilohy-dokumentu': coercedArray(prilohyDokumentuSchema),
  'Souvisejici-dokumenty': coercedArray(souvisejiciDokumentySchema),
  Spisovna: coercedArray(spisovnaSchema),
  'Vlozeno-do-spisu': vlozenoDoSpisuSchema.optional(),
})

export type SslDetailDokumentuWflDokument = z.infer<typeof wflDokumentSchema>
export type SslDetailDokumentuDoruceni = z.infer<typeof doruceniSchema>
export type SslDetailDokumentuEDoruceni = z.infer<typeof eDoruceniSchema>
export type SslDetailDokumentuHistorieDokumentuItem = z.infer<typeof historieDokumentuSchema>
export type SslDetailDokumentuSslDokument = z.infer<typeof sslDokumentSchema>
export type SslDetailDokumentuSslSpis = z.infer<typeof sslSpisSchema>
export type SslDetailDokumentuSslObsahSpisItem = z.infer<typeof sslObsahSpisSchema>
export type SslDetailDokumentuCjDokumentu = z.infer<typeof cjDokumentuSchema>
export type SslDetailDokumentuPrilohyDokumentuItem = z.infer<typeof prilohyDokumentuSchema>
export type SslDetailDokumentuSouvisejiciDokumentyItem = z.infer<typeof souvisejiciDokumentySchema>
export type SslDetailDokumentuSpisovnaItem = z.infer<typeof spisovnaSchema>
export type SslDetailDokumentuVlozenoDoSpisu = z.infer<typeof vlozenoDoSpisuSchema>
export type SslDetailDokumentuResponse = z.infer<typeof detailDokumentuResponseSchema>

export async function detailDokumentu(
  this: Ginis,
  bodyObj: SslDetailDokumentuRequest
): Promise<SslDetailDokumentuResponse> {
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
      paramsBodies: [bodyObj],
      paramOrders: detailDokumentuParamOrders,
    }),
    this.config.debug
  )
  return await extractResponseJson(response.data, requestName, detailDokumentuResponseSchema)
}
