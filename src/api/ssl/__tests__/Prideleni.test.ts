import { Ginis } from '../../../index'

describe('SSL-Prideleni', () => {
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
    const data = await ginis.ssl.prideleni({
      'Id-dokumentu': 'MAG0X04X96LQ',
      'Id-uzlu': 'MAG0SS00A01L',
      'Id-funkce': 'MAG0SF00B73W',
      'Ucel-distribuce': 'test pridelenia',
      'Prime-prideleni': 'prime-prideleni',
    })

    expect(data['Prideleni']['Datum-zmeny']).toBeTruthy()
  }, 20_000)
})
