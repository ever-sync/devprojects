declare module '@react-pdf/renderer' {
  import * as React from 'react'

  export const Document: React.ComponentType<any>
  export const Page: React.ComponentType<any>
  export const Text: React.ComponentType<any>
  export const View: React.ComponentType<any>
  export const Font: {
    register: (input: any) => void
  }
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T
  }
  export const PDFDownloadLink: React.ComponentType<any>
}
