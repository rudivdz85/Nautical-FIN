import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const specPath = join(process.cwd(), '..', '..', 'docs', 'openapi.yaml')
    const spec = readFileSync(specPath, 'utf-8')
    return new NextResponse(spec, {
      headers: {
        'Content-Type': 'text/yaml',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'OpenAPI spec not found' },
      { status: 404 },
    )
  }
}
