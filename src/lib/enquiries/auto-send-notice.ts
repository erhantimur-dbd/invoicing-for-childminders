export const AUTO_SEND_CONNECT_NOTICE =
  'Auto-send is on: Go Dottie will reply to enquiries from your Gmail automatically. You can switch to draft & approve now or any time.'

export function sendModeStatusLabel(mode: 'auto' | 'approve'): string {
  return mode === 'auto' ? 'Auto-send: on' : 'Draft & approve: on'
}
