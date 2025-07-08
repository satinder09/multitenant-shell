import { NextRequest, NextResponse } from 'next/server'
import { ServerApiClient } from '@/shared/services/api/server-client'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { methodId: string } }
) {
  try {
    const { methodId } = params
    const serverApi = new ServerApiClient()
    
    const response = await serverApi.delete(`/platform/2fa/method/${methodId}`, {}, req)
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }
  } catch (error) {
    console.error('Error disabling 2FA method:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA method' },
      { status: 500 }
    )
  }
} 