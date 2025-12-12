import { Ginis } from '../../../index'

describe('GIN-Najdi-esu', () => {
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
