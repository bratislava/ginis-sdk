import { createReadStream } from 'fs'
import { Ginis } from '../../../index'

const fs = require('fs').promises

jest.setTimeout(20000)

describe('Pridat-soubor', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ssl: 'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/SSL01_TEST/Ssl.svc',
        ssl_mtom: 'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/SSL01_BRA/Ssl.svc/mtom',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    console.log('start reading')
    const contents = await fs.readFile('./src/api/ssl/__tests__/raw-data.bin', {
      encoding: 'base64',
    })
    console.log('done reading ')

    const data = await ginis.ssl.pridatSoubor({
      'Id-dokumentu': 'MAG0X03RYYSN',
      'Jmeno-souboru': 'raw-data.bin',
      'Typ-vazby': 'elektronicka-priloha',
      'Popis-souboru': 'base64',
      Data: contents,
    })

    expect(data['Pridat-soubor']['Verze-souboru']).toBeTruthy()
  })

  test('MTOM request', async () => {
    const fileName = 'plain-data.txt'

    console.log('start reading')
    let contentStream = createReadStream(`./src/api/ssl/__tests__/${fileName}`)
    console.log('done reading ')

    const data = await ginis.ssl.pridatSouborMtom({
      'Id-dokumentu': 'MAG0X03RYYSN',
      'Jmeno-souboru': fileName,
      'Typ-vazby': 'elektronicka-priloha',
      'Popis-souboru': 'mtom-xop',
      Obsah: contentStream,
    })
    expect(data['Pridat-soubor']?.['Verze-souboru']).toBeTruthy()
  })
})
