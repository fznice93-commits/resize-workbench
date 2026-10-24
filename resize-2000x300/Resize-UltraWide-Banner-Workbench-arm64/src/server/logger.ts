const forbidden=/authorization|api[_ -]?key|prompt|base64|multipart|headers?|source|filename|url/i;
export function redactRecord(input:Record<string,unknown>){return Object.fromEntries(Object.entries(input).filter(([k])=>!forbidden.test(k)).map(([k,v])=>[k,typeof v==="string"?v.slice(0,256):v]))}
export function structuredLine(input:Record<string,unknown>){return JSON.stringify(redactRecord(input))}
