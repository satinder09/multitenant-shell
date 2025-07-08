import { NextRequest, NextResponse } from 'next/server'
import { ServerApiClient } from '@/shared/services/api/server-client'

export async function GET(req: NextRequest) {
  try {
    const serverApi = new ServerApiClient()
    const response = await serverApi.get('/platform/2fa/status', {}, req)
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }
  } catch (error) {
    console.error('Error fetching 2FA status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch 2FA status' },
      { status: 500 }
    )
  }
} 