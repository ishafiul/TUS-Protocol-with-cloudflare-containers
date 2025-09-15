
export interface Digester {
  update: (bytes: ArrayBuffer | ArrayBufferView) => Promise<void>

  digest: () => Promise<ArrayBuffer | undefined>
}

export function noopDigester(): Digester {
  return {
    async update(_bytes: ArrayBuffer | ArrayBufferView): Promise<void> {
      return Promise.resolve()
    },
    async digest(): Promise<ArrayBuffer | undefined> {
      return undefined
    },
  }
}

export function sha256Digester(): Digester {
  const stream = new crypto.DigestStream('SHA-256')
  const writer = stream.getWriter()
  return {
    async update(bytes: ArrayBuffer | ArrayBufferView): Promise<void> {
      return await writer.write(bytes)
    },
    async digest(): Promise<ArrayBuffer | undefined> {
      await writer.close()
      return await stream.digest
    },
  }
}
