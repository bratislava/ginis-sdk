import { GinisConfig } from "../../ginis";

export type GetPropertyType<T extends string> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean :
  T extends 'object' ? object :
  unknown;

  export type XmlRequestInfo = {
    name: string
    namespace: string
    xrgNamespace: string
    paramsBody: any
    paramOrder: readonly (string)[]
  }

export function createXmlRequestConfig(requestName: string, requestNamespace: string) {
  return {
    headers: createXmlRequestHeader(requestName, requestNamespace)
  }
}

export function createXmlRequestHeader(requestName: string, requestNamespace: string) {
  return {
    'SOAPAction': `${requestNamespace}/${requestName}`,
    'Content-Type': 'text/xml; charset=utf-8',
  }
}

export function createXmlRequestBody(config: GinisConfig, requestInfo: XmlRequestInfo) {
return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security s:mustUnderstand="1"
      xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <o:UsernameToken u:Id="uuid-ea5d8d3d-df90-4b69-b034-9026f34a3f21-1">
        <o:Username>${config.username}</o:Username>
        <o:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${config.password}</o:Password>
      </o:UsernameToken>
    </o:Security>
  </s:Header>
  <s:Body>
    <${requestInfo.name} xmlns="${requestInfo.namespace}">
      <requestXml>
        <Xrg xmlns="${requestInfo.xrgNamespace}">
          <${requestInfo.name}>
            ${requestInfo.paramOrder.filter(e => requestInfo.paramsBody[e]).map(e => `<${e}>${requestInfo.paramsBody[e]}</${e}>`).join('')}
          </${requestInfo.name}>
        </Xrg>
      </requestXml>
    </${requestInfo.name}>
  </s:Body>
</s:Envelope>`.replaceAll(/\s*(<[^>]+>)\s*/g, '$1');
}

export function extractResponseJson<T>(responseXml: string, requestName: string): T {
  let parser = require('xml2json')
  return JSON.parse(parser.toJson(responseXml))['s:Envelope']['s:Body'][`${requestName}Response`][`${requestName}Result`].Xrg
}
