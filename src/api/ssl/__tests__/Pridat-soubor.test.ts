import { createReadStream, promises as fs } from 'fs'

import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('SSL-Pridat-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    ginis = new Ginis({
      urls: {
        ssl: envGetOrThrow('GINIS_SSL_HOST'),
        ssl_mtom: envGetOrThrow('GINIS_SSL_MTOM_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Basic request', async () => {
    const contents = await fs.readFile('./src/api/ssl/__tests__/raw-data.bin', {
      encoding: 'base64',
    })

    const data = await ginis.ssl.pridatSoubor({
      'Id-dokumentu': 'MAG0X05DA0O1',
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

    const data = await ginis.ssl.pridatSouborMtom(
      {
        'Id-dokumentu': 'MAG0X05DA0O1',
        'Jmeno-souboru': fileName,
        'Typ-vazby': 'elektronicka-priloha',
        'Popis-souboru': 'mtom-xop',
      },
      contentStream
    )
    expect(data['Pridat-soubor']['Verze-souboru']).toBeTruthy()
  }, 20_000)
})
