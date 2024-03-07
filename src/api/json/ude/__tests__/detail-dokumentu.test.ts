import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('detail-dokumentu', () => {
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
    const dataXrg = await ginis.json.ude.detailDokumentu({
      'Id-zaznamu': 'MAG00B1RTOOW#0',
    })

    // const documentDetail = dataXrg.DetailDokumentu
    let documentFiles = dataXrg.SouboryDokumentu

    // Keeping the approach from old XML endpoint to double-check if documentFiles are always an array
    if (Array.isArray(documentFiles)) {
      // do nothing, needed for TS
    } else if (typeof documentFiles === 'object') {
      documentFiles = [documentFiles]
    } else {
      documentFiles = []
    }

    expect(documentFiles[0]?.IdSouboru).toBe('MAG00B1RTOOW#0#MAG00B1RTOOW')
  })
})
