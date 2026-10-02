import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { welcomeEmail } from './templates.ts'

describe('welcomeEmail', () => {
  it('uses the Welcome to Go Dottie subject and the enquiries assistant line', () => {
    const { subject, html } = welcomeEmail({ name: 'Sam Rivera' })
    assert.equal(subject, 'Welcome to Go Dottie, Sam')
    assert.doesNotMatch(subject, /\p{Extended_Pictographic}/u)
    assert.equal(subject.includes("I'm Go Dottie, and I'm here to help"), false)
    assert.match(html, /Welcome to Go Dottie, Sam/)
    assert.match(html, /Go Dottie, your enquiries assistant/)
    assert.equal(html.includes("I'm Go Dottie, and I'm here to help"), false)
    assert.match(html, /background-color:#f0fdf4/)
  })
})
