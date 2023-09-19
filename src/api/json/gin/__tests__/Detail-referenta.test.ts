import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('Detail-referenta', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        gin: 'http://172.25.1.195/gordic/ginis/ws/GIN01/Gin.svc',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.json.gin.detailReferenta({
      'Id-osoby': 'MAG0SF00A19L',
    })
    expect(data?.DetailReferenta?.['Id-osoby']).toBe('MAG0SF00A19L')
  })
})
