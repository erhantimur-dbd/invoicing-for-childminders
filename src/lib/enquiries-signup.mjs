/** Where an Enquiries signup control goes when payments are open or closed. */
export function enquiriesSignupCta(open) {
  if (open) return { href: '/signup', label: 'Sign up', filled: true }
  return { href: '/demo', label: 'Book a demo', filled: true }
}

/**
 * FAQ "Is there a free trial?" answer.
 * When payments are open, the sentence is unchanged.
 * When they are closed, the signup clause becomes a Book a demo link.
 */
export function freeTrialAnswerParts(open) {
  if (open) {
    return {
      text: "No. Book a demo and we'll show you how Go Dottie handles a parent enquiry, or sign up for Enquiries at £160 a year.",
      href: null,
      linkLabel: null,
    }
  }
  return {
    text: "No. Book a demo and we'll show you how Go Dottie handles a parent enquiry.",
    href: '/demo',
    linkLabel: 'Book a demo',
  }
}

/** Every public Enquiries entry the marketing pages render. */
export function enquiriesEntryPoints(open) {
  const cta = enquiriesSignupCta(open)
  const trial = freeTrialAnswerParts(open)
  return {
    header: cta,
    hero: cta,
    mobile: cta,
    footer: cta,
    demo: cta,
    pricingCard: {
      href: open ? '/signup' : '/demo',
      label: open ? 'Sign up' : 'Book a demo',
      filled: true,
    },
    limited: { href: '/demo', label: 'Book a demo', filled: false },
    full: { href: '/demo', label: 'Book a demo', filled: false },
    faq: trial,
    signup: open ? '/signup' : '/demo',
    subscribeEnquiries: open ? '/subscribe?product=enquiries' : '/demo',
  }
}
