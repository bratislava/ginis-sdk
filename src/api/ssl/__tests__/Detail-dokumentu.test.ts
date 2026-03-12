import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('SSL-Detail-dokumentu', () => {
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
    const data = await ginis.ssl.detailDokumentu({
      'Id-dokumentu': 'MAG0X03RYYSN',
    })

    expect(data['Wfl-dokument']['Id-dokumentu']).toBe('MAG0X03RYYSN')
  }, 20_000)
})
