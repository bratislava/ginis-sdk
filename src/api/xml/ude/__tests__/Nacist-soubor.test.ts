import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('nacist-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude: process.env['GINIS_UDE_HOST'] ?? 'http://172.25.1.195/gordic/ginis/ws/Ude01/Ude.svc',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const dataXrg = await ginis.xml.ude.nacistSoubor({
      'Id-souboru': 'MAG00B0PVN5H#0#MAG00B0PVN5H',
    })

    let loadedFile = dataXrg['Nacist-soubor']

    expect(loadedFile?.['Jmeno-souboru']).toBe('Plnenie UZN c. 135_2015 február 2021.pdf')
  })
})
