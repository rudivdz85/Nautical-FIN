'use client'

import { useEffect } from 'react'

export default function ApiDocsPage() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js'
    script.onload = () => {
      // @ts-expect-error SwaggerUIBundle is loaded via script tag
      window.SwaggerUIBundle({
        url: '/api/docs/openapi',
        dom_id: '#swagger-ui',
        presets: [
          // @ts-expect-error SwaggerUIBundle is loaded via script tag
          window.SwaggerUIBundle.presets.apis,
          // @ts-expect-error SwaggerUIStandalonePreset is loaded via script tag
          window.SwaggerUIStandalonePreset,
        ],
        layout: 'StandaloneLayout',
        deepLinking: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: false,
      })
    }
    document.body.appendChild(script)

    const standaloneScript = document.createElement('script')
    standaloneScript.src =
      'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js'
    document.body.appendChild(standaloneScript)

    return () => {
      document.head.removeChild(link)
      document.body.removeChild(script)
      document.body.removeChild(standaloneScript)
    }
  }, [])

  return (
    <div>
      <div id="swagger-ui" />
    </div>
  )
}
