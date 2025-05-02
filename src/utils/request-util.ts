/* eslint-disable sonarjs/slow-regex */
import { PassThrough, Readable } from 'stream'
import { parseStringPromise as parseXml } from 'xml2js'
import { ZodType } from 'zod'

import { GinisConfig } from '../ginis'
import { GinisError } from './errors'

export interface RequestParamOrder {
  name: string
  params: readonly string[]
}

export interface XmlRequestInfo {
  name: string
  namespace: string
  xrgNamespace: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paramsBodies: any[]
  paramOrders: readonly RequestParamOrder[]
}

export function createXmlRequestConfig(requestName: string, requestNamespace: string) {
  return {
    headers: {
      SOAPAction: `${requestNamespace}/${requestName}`,
      'Content-Type': 'text/xml; charset=utf-8',
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateRequestNode(paramOrder: RequestParamOrder, paramsBody: any) {
  return `<${paramOrder.name}>${paramOrder.params
    // find all parameters with respect to their strict order that are present in paramsBody
    // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-member-access
    .filter((e) => paramsBody[e])
    // wrap the value of the parameter into its XML tag
    // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-member-access
    .map((e) => `<${e}>${paramsBody[e]}</${e}>`)
    .join('')}</${paramOrder.name}>`
}

export function createXmlRequestBody(config: GinisConfig, requestInfo: XmlRequestInfo) {
  return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
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
          ${requestInfo.paramOrders.map((e, i) => generateRequestNode(e, requestInfo.paramsBodies.at(i))).join('')}
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

export function createMultipartRequestConfig(
  requestName: string,
  requestNamespace: string,
  boundary: string,
  requestContentId: string
) {
  return {
    headers: {
      SOAPAction: `${requestNamespace}/${requestName}`,
      'Content-Type': `multipart/related;type="application/xop+xml";boundary="${boundary}";start="<${requestContentId}>";start-info="text/xml"`,
      'MIME-version': '1.0',
    },
  }
}

export function createMultipartRequestBody(
  config: GinisConfig,
  requestInfo: XmlRequestInfo,
  fileStream: Readable,
  boundary: string,
  requestContentId: string,
  fileContentId: string
) {
  const xopFileInclude = `<Data><Include xmlns="http://www.w3.org/2004/08/xop/include" href="cid:${fileContentId}"/></Data>`
  const xmlRequest = createXmlRequestBody(config, requestInfo).replace(
    `<Data>${fileContentId}</Data>`,
    xopFileInclude
  )
  const mainRequest =
    `--${boundary}\r\n` +
    `Content-ID:<${requestContentId}>\r\n` +
    `Content-Transfer-Encoding: 8bit\r\n` +
    `Content-Type: application/xop+xml;charset=utf-8;type="text/xml"\r\n\r\n${
      xmlRequest
    }\r\n--${boundary}\r\n` +
    `Content-ID:<${fileContentId}>\r\n` +
    `Content-Transfer-Encoding: binary\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`

  const closingBoundary = `\r\n--${boundary}--`

  const requestBody = new PassThrough()
  requestBody.write(mainRequest)
  fileStream.pipe(requestBody, { end: false })
  fileStream.on('end', () => {
    requestBody.end(closingBoundary)
  })

  return requestBody
}

export async function extractMultipartResponseJson<T>(
  responseString: string,
  requestName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema: ZodType<T, any, any>
): Promise<T> {
  const startTag = '<s:Envelope'
  const endTag = '</s:Envelope>'
  let responseXml: string
  try {
    responseXml = responseString.substring(
      responseString.indexOf(startTag),
      responseString.lastIndexOf(endTag) + endTag.length
    )
  } catch (error) {
    const message = error instanceof Error ? `: ${error.toString()}` : ''
    throw new GinisError(
      `Failed to parse multipart response${message}\r\nResponse: ${responseString}`
    )
  }
  return await extractResponseJson(responseXml, requestName, responseSchema)
}
