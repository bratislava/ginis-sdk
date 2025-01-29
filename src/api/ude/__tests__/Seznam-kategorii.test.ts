import { Ginis } from '../../../index'

jest.setTimeout(20000)

describe('seznam-kategorii', () => {
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
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.xml.ude.seznamKategorii({})

    let categories = data['Seznam-kategorii']

    // Keeping the approach from old XML endpoint to double-check if documentFiles are always an array
    if (Array.isArray(categories)) {
      // do nothing
    } else if (typeof categories === 'object') {
      categories = [categories]
    } else {
      categories = []
    }

    expect(categories.length).toBeGreaterThan(0)
  })
})
