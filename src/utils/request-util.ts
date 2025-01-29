import { GinisConfig } from '../ginis'
import { parseStringPromise as parseXml } from 'xml2js'
import { GinisError } from './errors'

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

export async function extractResponseJson<T>(responseXml: string, requestName: string): Promise<T> {
  const options = {
    explicitArray: false,
    ignoreAttrs: true,
  }

  let response: any

  try {
    response = await parseXml(responseXml, options)
  } catch (error) {
    let message = error instanceof Error ? `: ${error.message}` : ''
    throw new GinisError(`Failed to parse XML${message}`)
  }

  if (!response) {
    throw new GinisError('Parsed XML response is empty.')
  }

  const xrg =
    response?.['s:Envelope']?.['s:Body']?.[`${requestName}Response`]?.[`${requestName}Result`]?.Xrg
  if (typeof xrg != 'undefined') {
    return xrg
  }

  throwErrorFaultDetail(response, new GinisError(`Error parsing response data.`), false)
}

function throwErrorFaultDetail(response: any, error: any, includeError = true): never {
  const fault = response?.['s:Envelope']?.['s:Body']?.['s:Fault']
  if (typeof fault == 'undefined' || !fault) {
    throw error
  }
  let errorDetail = `Error response details: ${JSON.stringify(fault, null, 2)}`
  if (!includeError) {
    throw new GinisError(errorDetail)
  }
  try {
    error.message = `${error.message}\r\n${errorDetail}`
    throw error
  } catch (ignored) {}
  throw new GinisError(errorDetail)
}

export async function throwErrorResponseDetail(responseXml: string, error: any): Promise<never> {
  let response: any
  try {
    response = await parseXml(responseXml, { explicitArray: false })
  } catch (ignored) {
    throw error
  }
  throwErrorFaultDetail(response, error)
}
