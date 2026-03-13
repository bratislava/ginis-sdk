import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('UDE-Seznam-kategorii', () => {
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
    const data = await ginis.ude.seznamKategorii({})

    expect(data['Seznam-kategorii'].length).toBeGreaterThan(0)
  }, 20_000)
})
