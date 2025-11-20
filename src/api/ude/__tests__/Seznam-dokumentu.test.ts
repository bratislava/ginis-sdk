import { Ginis } from '../../../index'

describe('UDE-Seznam-dokumentu', () => {
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
    const data = await ginis.ude.seznamDokumentu({
      Stav: 'vyveseno',
    })

    expect(data['Seznam-dokumentu'].length).toBeGreaterThan(0)
  }, 20_000)

  test('Archive filter request', async () => {
    const data = await ginis.ude.seznamDokumentu({
      Stav: 'sejmuto',
      'Vyveseno-od': '2024-01-01',
      'Vyveseno-od-horni-mez': '2024-03-01',
    })
    const filteredData = await ginis.ude.seznamDokumentuFilterArchiv({
      Stav: 'sejmuto',
      'Vyveseno-od': '2024-01-01',
      'Vyveseno-od-horni-mez': '2024-03-01',
    })

    expect(filteredData['Seznam-dokumentu'].length).toBeGreaterThan(0)
    expect(filteredData['Seznam-dokumentu'].length).toBeLessThan(data['Seznam-dokumentu'].length)

    const originalRecordIds = new Set(data['Seznam-dokumentu'].map((doc) => doc['Id-zaznamu']))
    const filteredRecordIds = filteredData['Seznam-dokumentu'].map((doc) => doc['Id-zaznamu'])
    expect(filteredRecordIds.every((id) => originalRecordIds.has(id))).toBe(true)
  }, 20_000)
})
