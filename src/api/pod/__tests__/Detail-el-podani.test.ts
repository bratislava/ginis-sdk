import { Ginis } from '../../../index'

// POD endpoints are disabled, as POD is not licensed after test period expired
describe.skip('POD-Detail-el-podani', () => {
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
      'Id-zpravy': 'fb0d1873-19f5-43a2-a4c4-5924951a019b',
    })

    expect(data['Detail-el-podani']['Id-dokumentu']).toBe('MAG0X04WW5AM')
  }, 20_000)
})
