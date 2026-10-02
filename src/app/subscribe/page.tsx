import { redirect } from 'next/navigation'
import { isPaidSignupOpen } from '@/lib/stripe/prices'
import SubscribeClient from './subscribe-client'

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const { product } = await searchParams
  const paymentsOpen = await isPaidSignupOpen()
  if (!paymentsOpen && product === 'enquiries') redirect('/demo')
  return <SubscribeClient paymentsOpen={paymentsOpen} />
}
