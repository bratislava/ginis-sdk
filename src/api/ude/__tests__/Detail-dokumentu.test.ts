import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('UDE-Detail-dokumentu', () => {
  let ginis: Ginis
  beforeAll(() => {
    ginis = new Ginis({
      urls: {
        ude: envGetOrThrow('GINIS_UDE_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.ude.detailDokumentu({
      'Id-zaznamu': 'MAG00B0PVN5H#0',
    })

    expect(data['Soubory-dokumentu'][0]?.['Id-souboru']).toBe('MAG00B0PVN5H#0#MAG00B0PVN5H')
  }, 20_000)
})
