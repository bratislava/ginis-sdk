import { Ginis } from '../../../index'

jest.setTimeout(20000)

describe('Detail-el-podani', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        pod:
          process.env['GINIS_POD_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/POD01/Pod.svc',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.pod.detailElPodani({
      'Id-zpravy': '598f50c0-d08a-41bd-bfcd-6f1a1dad9843',
    })

    expect(data['Detail-el-podani']['Id-dokumentu']).toBe('MAG0X03RYYSN')
  })
})
