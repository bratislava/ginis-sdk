# ginis-sdk

[![npm](https://img.shields.io/npm/v/@bratislava/ginis-sdk)](https://www.npmjs.com/package/@bratislava/ginis-sdk)

A small wrapper for most commonly used requests towards the GINIS system. Made to be used by applications of city of [Bratislava](https://github.com/bratislava)

## Installation

`npm i @bratislava/ginis-sdk`

## Using the library

To understand how the structure of `Ginis.xml` and `urls` part of the config relates to the GINIS system, read the [GINIS section](https://bratislava.github.io/GINIS) of our documentation site.

You'll need the GINIS credentials. If interacting with the Bratislava deployment, you also need to be connected through VPN or on internal network.

Initialize the Ginis class within your project:

```ts
const ginis = new Ginis({
  // connect to any subset of services needed, all the urls are optional but requests to services missing urls will fail
  urls: {
    ude: 'http://host/your/ude/endpoint/Ude.svc',
    ssl: 'http://host/your/ssl/endpoint/Ssl.svc',
  },
  // credentials
  username: process.env.GINIS_USERNAME,
  password: process.env.GINIS_PASSWORD,
  // if debug === true prints all the requests and responses into console
  // warning - these logs WILL include credentials!
  debug: true,
})
```

Use the xml-returning requests:

```ts
// the options object uses same keys as the requests in Ginis docs
// i.e. https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=390&methodName=seznam-dokumentu&type=request
// will throw an Axios error if the request fails
const data = await ginis.json.ssl.detailDokumentu({
  'Id-dokumentu': 'MAG0X03RYYSN',
})
```

## Extending the library

The `src/api` is structured after the GINIS modules, each subdirectory a single service, each file a single action - for more info on the hierarchy, see our [GINIS docs](https://bratislava.github.io/GINIS).

You can read / reproduce / add new requests in the `/src/api/json/[service-name]/[Action-name].ts` (`/src/api/xml` request considered legacy and have slightly different structure). Read through a couple files and you should be set. To get the typescript typing, either copy the structure from official Gordic docs and update the right-hand side by hand (they are usually strings), or make a manual request and use a tool such as quicktype.io.

TS docs frequently reference [the official Gordic documentation](https://robot.gordic.cz/xrg/Default.html) (you'll need to create an account to access it). Once you are logged in, you can browse the full docs with request/reponse formats and all the available endpoints (of which we wrap just a subset).

## Developing and running tests

For each new service / request you should add appropriate tests in the `__tests__` subdirectory of the service directory. For xml, place them directly in `src/api/xml/__tests__`, one file per service.

You need to have GINIS credentials setup in `.env` file - see `.env.example`. If interacting with the Bratislava deployment, you also need to be connected through VPN or on internal network.

Start the test using

`npm test`

## XML example

We should have services we need available as JSON endpoints, previous xml requests are kept in as documentation.

```ts
// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=390&methodName=seznam-dokumentu&type=request
export const seznamDokumentu = async (
  config: GinisConfig,
  url: string | undefined,
  bodyObj: seznamDokumentu
) => {
  const axiosConfig: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0/Seznam-dokumentu',
    },
  }
  const body = `
        <s:Envelope
          xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
          xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
          <s:Header>
            <o:Security s:mustUnderstand="1"
              xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
              <o:UsernameToken u:Id="uuid-ea5d8d3d-df90-4b69-b034-9026f34a3f21-1">
                <o:Username>${config.username}</o:Username>
                <o:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${
                  config.password
                }</o:Password>
              </o:UsernameToken>
            </o:Security>
          </s:Header>
          <s:Body>
            <Seznam-dokumentu
              xmlns="http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0">
              <requestXml>
                <Xrg
                  xmlns="http://www.gordic.cz/xrg/ude/seznam-dokumentu/request/v_1.0.0.0">
                  <Seznam-dokumentu>
                    ${Object.entries(bodyObj).map(([key, value]) => `<${key}>${value}</${key}>`)}
                  </Seznam-dokumentu>
                </Xrg>
              </requestXml>
            </Seznam-dokumentu>
          </s:Body>
        </s:Envelope>
      `
  return makeAxiosRequest(axiosConfig, url, body, config.debug)
}
```

## Documentation

Explore the [docs](https://bratislava.github.io/json-schema-xsd-tools/).

## License

[EUPL-1.2](https://github.com/bratislava/json-schema-xsd-tools/blob/master/LICENSE.md)
