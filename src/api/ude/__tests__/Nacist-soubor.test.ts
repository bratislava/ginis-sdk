import { Ginis } from '../../../index'
import { NacistSouborResponse } from '../Nacist-soubor'

jest.setTimeout(20000)

describe('nacist-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude:
          process.env['GINIS_UDE_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/Ude01/Ude.svc',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  test('Basic request', async () => {
    let data: NacistSouborResponse
    try {
      data = await ginis.ude.nacistSoubor({
        'Id-souboru': 'MAG00B0PVN5H#0#MAG00B0PVN5H',
      })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      const noDiskError =
        'Chyba: El. dokument nelze stáhnout, protože se nachází na zrušeném disku.'
      const noDiskErrorCode = 'kód: 24200135'
      if (error.message.includes(noDiskError) || error.message.includes(noDiskErrorCode)) {
        // this means the request format is correct and file ID is valid
        console.warn('Skipping test as no disk is available within this environment.')
        return
      }

      throw error
    }

    expect(data['Nacist-soubor']?.['Jmeno-souboru']).toBe(
      'Plnenie UZN c. 135_2015 február 2021.pdf'
    )
  })
})
