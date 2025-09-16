# ginis-sdk

[![npm](https://img.shields.io/npm/v/@bratislava/ginis-sdk)](https://www.npmjs.com/package/@bratislava/ginis-sdk)

A small wrapper for most commonly used requests towards the GINIS system. Made to be used by applications of city of [Bratislava](https://github.com/bratislava).

## Installation

`npm i @bratislava/ginis-sdk`

## Using the library

To understand how the structure of `Ginis` and `urls` part of the config relates to the GINIS system, read the [GINIS section](https://bratislava.github.io/GINIS) of our documentation site.

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
  username: process.env['GINIS_USERNAME'],
  password: process.env['GINIS_PASSWORD'],
  // if debug === true prints all the requests and responses into console
  // WARNING - these logs WILL include credentials!
  debug: true,
})
```

Use the requests:

```ts
// the options object uses same keys as the requests in Ginis docs
// i.e. https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=UDE&version=390&methodName=seznam-dokumentu&type=request
// will throw a Ginis error if the request fails
const data = await ginis.ssl.detailDokumentu({
  'Id-dokumentu': 'MAG0X03RYYSN',
})
```

All requests and responses of this library are via JavaScript objects. However, due to underlying Ginis API using XMLs, the object properties are kept consistent with them. They are using a dash case with only the very first letter being capital written in Czech such as `'Id-dokumentu'`, `'Souvisejici-dokumenty'`, or `'Historie-dokumentu'`.

### Error handling

The library should only throw instances of `GinisError` for all expected or predictable erroneous situations. If the underlying cause is `AxiosError`, the whole error will be available inside the `GinisError` object under `axiosError` property.

### Response guarantees

All responses from this library are validated using `zod` to check for required parameters. Furthermore, all array properties are guaranteed to be defined and to be array. If there are no elements, the array will be empty and if there is only one elements, it will still be wrapped in an array.

All values are only defined as strings and are not validated further; e.g. there is no check if

- value matches one of the enum values for enum fields
- value is numeric or in specified range for number fields
- value matches the format for date fields

## Extending the library

The `src/api` is structured after the GINIS modules, each subdirectory a single service, each file a single action - for more info on the hierarchy, see our [GINIS docs](https://bratislava.github.io/GINIS).

TS docs frequently reference [the official Gordic documentation](https://robot.gordic.cz/xrg/Default.html) (you'll need to create an account to access it). Once you are logged in, you can browse the full docs with request/response formats and all the available endpoints (of which we wrap just a subset).

You can read / reproduce / add new requests in the `/src/api/[service-name]/[Action-name].ts`. Read through a couple files and you should be set. Since the Ginis API uses SOAP directly or inside a multipart request, there are some challenges when dealing with XMLs.

### XML accommodations

#### Request type

The most important part of this particular Ginis API is that the order of the parameters for each request must be in the same order as defined in request's Gordic documentation. JavaScript objects don't guarantee any property order when iterating over them. For this reason, all properties for all requests are defined in an array, and the request type is dynamically derived from it:

```ts
// https://robot.gordic.cz/xrg/Default.html?c=OpenMethodDetail&moduleName=SSL&version=390&methodName=Detail-dokumentu&type=request
const detailDokumentuRequestProperties = [
  'Id-dokumentu',
  'Vyradit-historii',
  'Vyradit-obsah-spisu',
  'Vyradit-prilohy',
  'Vyradit-souvisejici',
  'Id-esu',
  'Vyradit-doruceni',
  'Id-eu',
] as const

export type DetailDokumentuRequest = {
  [K in (typeof detailDokumentuRequestProperties)[number] as K]?: RequestParamType
}
```

Currently, all request properties are marked as optional strings regardless of their actual type or if they are required by the endpoint. There is also a way to include XML tag attributes. There is no input validation on the library side and all requests are ultimately accepted or rejected directly by the underlying Ginis API.

```ts
export interface RequestParamValue {
  value: string
  attributes: string[]
}

export type RequestParamType = string | undefined | RequestParamValue
```

#### Response type

Instead of response type we primarily define a validation `zod` schema. We validate the output of the Ginis API to guarantee, that all the required fields are present and populated. We don't validate values as all simple properties are only utilizing string type - see [response guarantees](#response-guarantees).

```ts
const detailElPodaniSchema = z.object({
  'Datum-prijeti': z.string(),
  'Stav-zpracovani': z.string(),
  'Duvod-odmitnuti': z.string().optional(),
  'Stav-podani-kod': z.string(),
  'Stav-podani-text': z.string().optional(),
  'Stav-odpovedi-kod': z.string(),
  'Stav-odpovedi-text': z.string().optional(),
  'Id-dokumentu': z.string().optional(),
  Vec: z.string().optional(),
  'Spis-znacka': z.string().optional(),
  Znacka: z.string().optional(),
})

const navazanyDokumentSchema = z.object({
  'Id-dokumentu': z.string(),
  Vec: z.string().optional(),
  'Spis-znacka': z.string().optional(),
  Znacka: z.string().optional(),
})
```

Also, we transform all the array fields to actually contain array - empty, with one element, or multiple elements - regardless if the response contains the property or not via the `coercedArray` helper.

```ts
const detailElPodaniResponseSchema = z.object({
  'Detail-el-podani': detailElPodaniSchema,
  'Navazany-dokument': coercedArray(navazanyDokumentSchema),
})
```

Then, the response type is derived from the schema as such:

```ts
export type DetailElPodaniResponse = z.infer<typeof detailElPodaniResponseSchema>
```

## Developing and running tests

For each new service / request you should add appropriate tests in the `__tests__` subdirectory of the service directory, one file per request.

You need to have GINIS credentials setup in `.env` file - see `.env.example`. If interacting with the Bratislava deployment, you also need to be connected through VPN or on internal network.

Start the test using

```bash
npm run test
```

If you are experiencing circular structure errors related to `req` and/or `rsp` in jest while testing locally, instead use

```bash
npm run test:detect
```

which detects open handles preventing this issue.

## License

[EUPL-1.2](https://github.com/bratislava/json-schema-xsd-tools/blob/master/LICENSE.md)
