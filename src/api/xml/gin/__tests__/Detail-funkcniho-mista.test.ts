import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('Detail-funkcniho-mista', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        gin: 'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/GIN01_TEST/Gin.svc',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.xml.gin.detailFunkcnihoMista({
      'Id-funkce': 'MAG0SF00A19L',
    })
    expect(data?.['Detail-funkcniho-mista']?.['Id-funkce']).toBe('MAG0SF00A19L')
  })
})
