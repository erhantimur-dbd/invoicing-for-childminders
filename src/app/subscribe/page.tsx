import { redirect } from 'next/navigation'
import { readPaidSignupOpen } from '@/lib/paid-signup-render'
import SubscribeClient from './subscribe-client'

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const { product } = await searchParams
  const paymentsOpen = await readPaidSignupOpen()
  if (!paymentsOpen && product === 'enquiries') redirect('/demo')
  return <SubscribeClient paymentsOpen={paymentsOpen} />
}
