import { Ginis } from '../../../index'

jest.setTimeout(20000)

describe('Prehled-dokumentu', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ssl:
          process.env['GINIS_SSL_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/SSL01_TEST/Ssl.svc',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.ssl.prehledDokumentu(
      {
        'Datum-podani-od': '2025-02-20',
        'Datum-podani-do': '2025-04-10',
        'Priznak-spisu': 'neurceno',
        'Id-vlastnosti': 'MAG000V0A1I0',
        'Hodnota-vlastnosti-raw': '01234567-89ab-cdef-0123-000000000004',
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
    expect(data['Prehled-dokumentu'][0]?.['Id-dokumentu']).toBe('MAG0X04X96LQ')
  })
})
