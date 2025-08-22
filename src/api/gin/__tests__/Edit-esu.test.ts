import { v4 as uuidv4 } from 'uuid'

import { Ginis } from '../../../index'

describe('GIN-Edit-esu', () => {
  let ginis: Ginis
  const testPersonName = `Test${uuidv4().split('-')[0]}`
  const testPersonSurname = `TestOVI${uuidv4().split('-')[0]}`
  const testPersonEmail = `${testPersonSurname.toLowerCase()}.${testPersonName.toLowerCase()}@test.sk`
  const testPersonFullName = `${testPersonSurname} ${testPersonName}`
  const testPersonUri = `rc://sk/0011223344_${testPersonSurname.toLowerCase()}_${testPersonName.toLowerCase()}`
  let esuId: string

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

  test('Vytvor-esu request', async () => {
    const data = await ginis.gin.editEsu({
      'Typ-esu': 'fyz-osoba',
      Nazev: testPersonFullName,
      Poznamka: 'Testovacia osoba pre účely ginis-sdk SX/OVI',
      Verifikace: 'neurceno',
      'E-mail': testPersonEmail,
      'Obchodni-jmeno': testPersonFullName,
      'Typ-organizace': '70', // 70 = obcan
      Jmeno: testPersonName,
      Prijmeni: testPersonSurname,
      'Platce-dph': 'neplatce-dph',
      'Uroven-pristupu': '5', // 5 = konto
    })

    esuId = data['Vytvor-esu']['Id-esu']
    expect(esuId).toBeTruthy()

    /**
     * Should be 'zalozeni' only, since the name, surname and emails are all different and unique,
     * but ginis sometimes returns 'pouzito-existujici'. This needs to be resolved with the vendor.
     * It seems to work as intended with just the wrong return value (i.e. it seems to create a new
     * contact card anyway), but we can't rule out the possibility of reusing the same contact card
     * for different people at this point.
     */
    expect(['zalozeni', 'pouzito-existujici']).toContain(data['Vytvor-esu']['Provedena-operace'])
  }, 20_000)

  test('Edit-esu request', async () => {
    const data = await ginis.gin.editEsu({
      'Id-esu': esuId,
      'Rodne-cislo': '0011223344',
      'Datum-narozeni': '2000-11-22T00:00:00',
      'Id-dat-schranky': testPersonUri,
    })

    if (data['Vytvor-esu']['Provedena-operace'] === 'oprava-klicova') {
      esuId = data['Vytvor-esu']['Id-esu']
    } else {
      expect(data['Vytvor-esu']['Provedena-operace']).toBe('oprava-neklicova')
      expect(data['Vytvor-esu']['Id-esu']).toBe(esuId)
    }

    const findData = await ginis.gin.najdiEsu(
      {
        'E-mail': testPersonEmail,
      },
      {
        'Rozsah-prehledu': 'rozsireny',
      }
    )
    expect(findData['Najdi-esu'].length).toBeGreaterThan(0)
    const esu = findData['Najdi-esu'][0]

    expect(esu?.['Id-esu']).toBe(esuId)
    expect(esu?.['Typ-esu']).toBe('fyz-osoba')
    expect(esu?.['Nazev']).toBe(testPersonFullName)
    expect(esu?.['E-mail']).toBe(testPersonEmail)
    expect(esu?.['Obchodni-jmeno']).toBe(testPersonFullName)
    expect(esu?.['Rodne-cislo']).toBe('0011223344')
    expect(esu?.['Jmeno']).toBe(testPersonName)
    expect(esu?.['Prijmeni']).toBe(testPersonSurname)
    expect(esu?.['Id-dat-schranky']).toBe(testPersonUri)
    expect(esu?.['Verifikace']).toBe('neurceno')
    expect(esu?.['Aktivita']).toBe('aktivni')
  }, 20_000)
})
