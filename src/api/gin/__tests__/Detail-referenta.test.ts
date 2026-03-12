import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('GIN-Detail-referenta', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
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
    const data = await ginis.gin.detailReferenta({
      'Id-osoby': 'MAG0SR00C0EP',
    })

    expect(data['Detail-referenta']['Id-osoby']).toBe('MAG0SR00C0EP')
    expect(data['Detail-referenta']['Id-spisoveho-uzlu']).toBe('MAG0SS00A0C2')
  }, 20_000)
})
