import { createReadStream, promises as fs } from 'fs'

import { Ginis } from '../../../index'

describe('SSL-Pridat-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ssl:
          process.env['GINIS_SSL_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/SSL01_TEST/Ssl.svc',
        ssl_mtom:
          process.env['GINIS_SSL_MTOM_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/SSL01_BRA/Ssl.svc/mtom',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  test('Basic request', async () => {
    const contents = await fs.readFile('./src/api/ssl/__tests__/raw-data.bin', {
      encoding: 'base64',
    })

    const data = await ginis.ssl.pridatSoubor({
      'Id-dokumentu': 'MAG0X03RYYSN',
      'Jmeno-souboru': 'raw-data.bin',
      'Typ-vazby': 'elektronicka-priloha',
      'Popis-souboru': 'base64',
      Data: contents,
    })

    expect(data['Pridat-soubor']['Verze-souboru']).toBeTruthy()
  }, 20_000)

  test('MTOM request', async () => {
    const fileName = 'plain-data.txt'
    const contentStream = createReadStream(`./src/api/ssl/__tests__/${fileName}`)

    const data = await ginis.ssl.pridatSouborMtom({
      'Id-dokumentu': 'MAG0X03RYYSN',
      'Jmeno-souboru': fileName,
      'Typ-vazby': 'elektronicka-priloha',
      'Popis-souboru': 'mtom-xop',
      Obsah: contentStream,
    })
    expect(data['Pridat-soubor']['Verze-souboru']).toBeTruthy()
  }, 20_000)
})
