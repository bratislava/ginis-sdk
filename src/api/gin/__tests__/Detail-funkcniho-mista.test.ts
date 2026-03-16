import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('GIN-Detail-funkcniho-mista', () => {
  let ginis: Ginis
  beforeAll(() => {
    ginis = new Ginis({
      urls: {
        gin: envGetOrThrow('GINIS_GIN_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
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
