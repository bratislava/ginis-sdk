import { Ginis } from '../../../index'

jest.setTimeout(20000)

describe('Detail-referenta', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        gin:
          process.env['GINIS_GIN_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/GIN01_TEST/Gin.svc',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.gin.detailReferenta({
      'Id-osoby': 'MAG0SR00A0BU',
    })

    expect(data['Detail-referenta']['Id-osoby']).toBe('MAG0SR00A0BU')
  })
})
