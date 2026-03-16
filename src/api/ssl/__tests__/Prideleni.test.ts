import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('SSL-Prideleni', () => {
  let ginis: Ginis
  beforeAll(() => {
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
    const data = await ginis.ssl.prideleni({
      'Id-dokumentu': 'MAG0X05DA0O1',
      'Id-uzlu': 'MAG0SS00A0C2',
      'Id-funkce': 'MAG0SF00BIM4',
      'Ucel-distribuce': 'test pridelenia',
      'Prime-prideleni': 'prime-prideleni',
    })

    expect(data['Prideleni']['Datum-zmeny']).toBeTruthy()
  }, 20_000)
})
