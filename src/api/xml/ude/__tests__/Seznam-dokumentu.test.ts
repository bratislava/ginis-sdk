import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('seznam-dokumentu', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude: process.env['GINIS_UDE_HOST'] ?? 'http://172.25.1.195/gordic/ginis/ws/Ude01/Ude.svc',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const dataXrg = await ginis.xml.ude.seznamDokumentu({
      Stav: 'vyveseno',
    })

    let documents = dataXrg['Seznam-dokumentu']

    // Keeping the approach from old XML endpoint to double-check if documentFiles are always an array
    if (Array.isArray(documents)) {
      // do nothing
    } else if (typeof documents === 'object') {
      documents = [documents]
    } else {
      documents = []
    }

    expect(documents.length).toBeGreaterThan(0)
  })
})