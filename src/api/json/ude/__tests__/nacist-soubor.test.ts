import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('nacist-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude: process.env['GINIS_UDE_HOST'] ?? '',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const dataXrg = await ginis.json.ude.nacistSoubor({
      'Id-souboru': 'MAG00B1RUPFL#0#MAG00B1RUPFL',
    })

    let loadedFile = dataXrg.NacistSoubor

    // Keeping the approach from old XML endpoint to double-check if documentFiles are always an array
    if (Array.isArray(loadedFile)) {
      // do nothing, needed for TS
    } else if (typeof loadedFile === 'object') {
      loadedFile = [loadedFile]
    } else {
      loadedFile = []
    }

    expect(loadedFile[0]?.JmenoSouboru).toBe(
      'Zoznam služieb vykonávaných zmluvným dodávateľom A.I.I. Technické služby, s.r.o. na deň 6.3.2024 IV. obvod..pdf'
    )
  })
})
