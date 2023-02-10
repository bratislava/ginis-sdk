import { Ginis } from '../src/index'

describe('UDE', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude: 'http://172.25.1.195/gordic/ginis/ws/Ude01/Ude.svc',
      },
      username: process.env.GINIS_USERNAME,
      password: process.env.GINIS_PASSWORD,
      debug: true,
    })
  })

  test('Uradna tabula: MAG0AWO0A03L - Vyveseno', async () => {
    const { data } = await ginis.xml.ude.seznamDokumentu({
      Stav: 'vyveseno',
      'Id-uredni-desky': 'MAG0AWO0A03L',
    })
    // expect to get at least one entry, entries typically contain ids
    expect(data).toContain('<Id-zaznamu>')
  })
})
