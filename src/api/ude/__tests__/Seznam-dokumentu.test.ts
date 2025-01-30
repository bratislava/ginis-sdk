import { Ginis } from '../../../index'

jest.setTimeout(20000)

describe('seznam-dokumentu', () => {
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
    const data = await ginis.xml.ude.seznamDokumentu({
      Stav: 'vyveseno',
    })

    expect(data['Seznam-dokumentu'].length).toBeGreaterThan(0)
  })
})
