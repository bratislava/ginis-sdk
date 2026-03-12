import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('GIN-Najdi-esu', () => {
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

  test('Name, surname, email request', async () => {
    const data = await ginis.gin.najdiEsu(
      {
        Jmeno: 'Tester',
        Prijmeni: 'TestOVI',
        'E-mail': 'testovi@test.sk',
      },
      { 'Rozsah-prehledu': 'rozsireny' }
    )

    expect(data['Najdi-esu'].some((item) => item['Id-esu'] === 'MAG0SE1FQ4O6')).toBe(true)
  }, 20_000)

  test('Uri request', async () => {
    const data = await ginis.gin.najdiEsu(
      {
        'Id-dat-schranky': 'rc://sk/0011223344_testovi_tester',
      },
      { 'Rozsah-prehledu': 'rozsireny' }
    )

    expect(data['Najdi-esu'].some((item) => item['Id-esu'] === 'MAG0SE1FQ4O6')).toBe(true)
  }, 20_000)

  test('Empty result request', async () => {
    const data = await ginis.gin.najdiEsu(
      {
        'Id-dat-schranky': 'not-existing-uri',
      },
      { 'Rozsah-prehledu': 'rozsireny' }
    )
    expect(data['Najdi-esu'].length).toBe(0)
  }, 20_000)
})
