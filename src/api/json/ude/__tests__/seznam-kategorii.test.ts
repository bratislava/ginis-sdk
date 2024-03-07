import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('seznam-kategorii', () => {
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
    const dataXrg = await ginis.json.ude.seznamKategorii({})

    let categories = dataXrg.SeznamKategorii

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
