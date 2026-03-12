import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('SSL-Prehled-dokumentu', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ssl: envGetOrThrow('GINIS_SSL_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.ssl.prehledDokumentu(
      {
        'Datum-podani-od': '2025-05-01',
        'Datum-podani-do': '2025-12-31',
        'Priznak-spisu': 'neurceno',
        'Id-vlastnosti': 'MAG000V0A1LL',
        'Hodnota-vlastnosti-raw': '2d2d990a-8e2f-4f7a-ad49-3152e217be3c',
      },
      {
        'Priznak-generovani': 'generovat',
        'Radek-od': '1',
        'Radek-do': '10',
        'Priznak-zachovani': 'nezachovavat',
        'Rozsah-prehledu': 'standardni',
      }
    )

    expect(data['Stav-prehledu']['Radku-celkem']).toBe('1')
    expect(data['Prehled-dokumentu'].length).toBe(1)
    expect(data['Prehled-dokumentu'][0]?.['Id-dokumentu']).toBe('MAG0X05DA0O1')
  }, 20_000)
})
