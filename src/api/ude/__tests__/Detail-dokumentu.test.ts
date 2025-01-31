import { Ginis } from '../../../index'

jest.setTimeout(20000)

describe('detail-dokumentu', () => {
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
    const data = await ginis.ude.detailDokumentu({
      'Id-zaznamu': 'MAG00B0PVN5H#0',
    })

    expect(data['Soubory-dokumentu'][0]?.['Id-souboru']).toBe('MAG00B0PVN5H#0#MAG00B0PVN5H')
  })
})
