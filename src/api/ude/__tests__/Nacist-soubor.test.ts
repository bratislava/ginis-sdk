import { Ginis, UdeNacistSouborResponse } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('UDE-Nacist-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    ginis = new Ginis({
      urls: {
        ude: envGetOrThrow('GINIS_UDE_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Basic request', async () => {
    let data: UdeNacistSouborResponse
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
  }, 20_000)
})
