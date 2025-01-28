import { GinisConfig } from '../../ginis'
import { parseString } from 'xml2js'

export type XmlRequestInfo = {
  name: string
  namespace: string
  xrgNamespace: string
  paramsBody: any
  paramOrder: readonly string[]
}

export function createXmlRequestConfig(requestName: string, requestNamespace: string) {
  return {
    headers: {
    SOAPAction: `${requestNamespace}/${requestName}`,
    'Content-Type': 'text/xml; charset=utf-8',
    },
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
          <${requestInfo.name}>${requestInfo.paramOrder
            .filter((e) => requestInfo.paramsBody[e])
            .map((e) => `<${e}>${requestInfo.paramsBody[e]}</${e}>`)
            .join('')}</${requestInfo.name}>
        </Xrg>
      </requestXml>
    </${requestInfo.name}>
  </s:Body>
</s:Envelope>`.replaceAll(/\s*(<[^>]+>)\s*/g, '$1')
}

function parseXml(xml: string, ignoreAttributes = true): any {
  let result: any

  const options = {
    explicitArray: false,
    ignoreAttrs: ignoreAttributes,
  }

  parseString(xml, options, (err, parsedResult) => {
    if (err) {
      throw new Error(`Failed to parse XML: ${err.message}`)
    }
    result = parsedResult
  })
  return result
}

export function extractResponseJson<T>(responseXml: string, requestName: string): T {
  let response = parseXml(responseXml)
  if (typeof response == 'undefined' || !response) {
    throw new Error('Parsed XML response is empty.')
  }

  let error: any
  try {
    return response['s:Envelope']['s:Body'][`${requestName}Response`][`${requestName}Result`].Xrg
  } catch (e) {
    error = e
  }

  throwErrorFaultDetail(response, new Error(`Error parsing response data: ${error.message}`), false)
}

function throwErrorFaultDetail(response: any, error: any, includeError = true): never {
  let fault: any
  try {
    fault = response['s:Envelope']['s:Body']['s:Fault']
  } catch (ignored) {
    throw error
  }
  let errorDetail = `Error response details: ${JSON.stringify(fault, null, 2)}`
  if (!includeError) {
    throw new Error(errorDetail)
  }
  try {
    error.message = `${error.message}\r\n${errorDetail}`
    throw error
  } catch (ignored) {}
  throw new Error(errorDetail)
}

export function throwErrorResponseDetail(responseXml: string, error: any): never {
  let response: any
  try {
    response = parseXml(responseXml, false)
  } catch (ignored) {
    throw error
  }
  throwErrorFaultDetail(response, error)
}
