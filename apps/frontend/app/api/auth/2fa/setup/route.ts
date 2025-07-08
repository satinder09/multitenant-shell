import { NextRequest, NextResponse } from 'next/server'
import { ServerApiClient } from '@/shared/services/api/server-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const serverApi = new ServerApiClient()
    
    const response = await serverApi.post('/platform/2fa/setup', body, {}, req)
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }
  } catch (error) {
    console.error('Error setting up 2FA:', error)
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
} 