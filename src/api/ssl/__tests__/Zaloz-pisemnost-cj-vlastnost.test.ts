import { v4 as uuidv4 } from 'uuid'

import { Ginis } from '../../../index'

describe('SSL-Zaloz-pisemnost-cj-vlastnost', () => {
  let ginis: Ginis
  const formId = uuidv4()
  let documentId: string
  let propertyOrder: string
  const testPropertyCode = 'IDSFOR'

  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ssl:
          process.env['GINIS_SSL_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/SSL01_TEST/Ssl.svc',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  afterAll(async () => {
    try {
      await ginis.ssl.prideleni({
        'Id-dokumentu': documentId,
        'Id-uzlu': 'MAG0SS00A0C2',
        'Id-funkce': 'MAG0SF00BIM4',
        'Ucel-distribuce': 'test zaloz pisemnost',
        'Prime-prideleni': 'prime-prideleni',
      })
    } catch {
      // Ignore errors during cleanup
    }
  })

  test('Zaloz-pisemnost', async () => {
    const todayIso = new Date().toISOString().split('T')[0]
    const formPrefix = formId.substring(0, 4).toUpperCase()

    const data = await ginis.ssl.zalozPisemnost(
      {
        'Id-dokumentu': { value: formId, attributes: ['externi="true"'] },
        Vec: `Žiadosť nájomko - test formulár ${formPrefix}`,
        'Id-typu-dokumentu': 'MAG00400ABKL',
        'Priznak-fyz-existence': 'neexistuje',
      },
      {
        Stat: 'SVK',
        'Datum-odeslani': todayIso,
        'Datum-ze-dne': todayIso,
        'Zpusob-doruceni': 'neurceno',
        'Druh-zasilky': 'neurceno',
        'Druh-zachazeni': 'neurceno',
        'Datum-prijmu-podani': `${todayIso}T00:00:00`,
        'Id-odesilatele': 'MAG0SE14PG1L',
        'Poznamka-k-doruceni': 'D poznámka',
      },
      {
        Pristup: 'ke zverejneni',
        'Vec-podrobne': `Žiadosť nájomko - test formulár ${formPrefix} - SSL podrobne`,
        Poznamka: 'SSL poznámka',
        'Datum-podani': `${todayIso}T00:00:00`,
      }
    )
    documentId = data['Zaloz-pisemnost']['Id-dokumentu']
    expect(documentId).toBeTruthy()
  }, 20_000)

  test('Zaloz-cj', async () => {
    const data = await ginis.ssl.zalozCj({
      'Id-init-dokumentu': documentId,
      'Denik-cj': 'MAG',
    })
    expect(data['Zaloz-cj']['Znacka-cj']).toBeTruthy()
  }, 20_000)

  test('Zalozit-vlastnost-dokumentu', async () => {
    const data = await ginis.ssl.zalozitVlastnostDokumentu({
      'Id-dokumentu': documentId,
      'Typ-objektu': 'vlastnost',
      'Kod-objektu': testPropertyCode,
    })
    propertyOrder = data['Zalozit-vlastnost-dokumentu']['Poradove-cislo']
    expect(propertyOrder).toBeTruthy()
  }, 20_000)

  test('Nastavit-vlastnost-dokumentu', async () => {
    const data = await ginis.ssl.nastavitVlastnostDokumentu({
      'Id-dokumentu': documentId,
      'Kod-profilu': testPropertyCode,
      'Kod-struktury': testPropertyCode,
      'Kod-vlastnosti': testPropertyCode,
      'Poradove-cislo': propertyOrder,
      'Hodnota-raw': formId,
    })
    expect(data['Nastavit-vlastnost-dokumentu']['Poradove-cislo']).toBeTruthy()
  }, 20_000)
})
