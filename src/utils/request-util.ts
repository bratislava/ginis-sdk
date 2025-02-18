/* eslint-disable sonarjs/slow-regex */
import { parseStringPromise as parseXml } from 'xml2js'
import { ZodType } from 'zod'

import { GinisConfig } from '../ginis'
import { GinisError } from './errors'

export interface XmlRequestInfo {
  name: string
  namespace: string
  xrgNamespace: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // find all parameters with respect to their strict order that are present in paramsBody
            // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-member-access
            .filter((e) => requestInfo.paramsBody[e])
            // wrap the value of the parameter into its XML tag
            // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-member-access
            .map((e) => `<${e}>${requestInfo.paramsBody[e]}</${e}>`)
            .join('')}</${requestInfo.name}>
        </Xrg>
      </requestXml>
    </${requestInfo.name}>
  </s:Body>
</s:Envelope>`.replaceAll(/\s*(<[^>]+>)\s*/g, '$1') // regex removes whitespaces between elements
}

export async function extractResponseJson<T>(
  responseXml: string,
  requestName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema: ZodType<T, any, any>
): Promise<T> {
  try {
    // try catch is covering all parsing, access and validation problems
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await parseXml(responseXml, {
      explicitArray: false,
      ignoreAttrs: true,
    })

    return responseSchema.parse(
      // try catch is covering all parsing, access and validation problems
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response?.['s:Envelope']?.['s:Body']?.[`${requestName}Response`]?.[`${requestName}Result`]
        ?.Xrg
    )
  } catch (error) {
    const message = error instanceof Error ? `: ${error.toString()}` : ''
    throw new GinisError(`Failed to parse XML response${message}\r\nResponse: ${responseXml}`)
  }
}
