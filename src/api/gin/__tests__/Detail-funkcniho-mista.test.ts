import { Ginis } from '../../../index'

describe('GIN-Detail-funkcniho-mista', () => {
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
    const data = await ginis.gin.detailFunkcnihoMista({
      'Id-funkce': 'MAG0SF00BIM4',
    })

    expect(data['Detail-funkcniho-mista']['Id-funkce']).toBe('MAG0SF00BIM4')
    expect(data['Detail-funkcniho-mista']['Id-referenta']).toBe('MAG0SR00C0EP')
    expect(data['Detail-funkcniho-mista']['Id-spisoveho-uzlu']).toBe('MAG0SS00A0C2')
  }, 20_000)
})
