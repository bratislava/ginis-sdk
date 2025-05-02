import { Ginis } from '../../../index'

describe('SSL-Detail-dokumentu', () => {
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
    const data = await ginis.ssl.detailDokumentu({
      'Id-dokumentu': 'MAG0X03RYYSN',
    })

    expect(data['Wfl-dokument']['Id-dokumentu']).toBe('MAG0X03RYYSN')
  }, 20_000)
})
