import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { marketing, pricingAmounts } from './marketing.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('canvas is corporate cool off-white, not paper or old cream', () => {
  const canvas = marketing.canvas.toLowerCase()
  assert.notEqual(canvas, '#fdf8f1')
  assert.notEqual(canvas, '#f3eee4')
  assert.equal(canvas, '#f6f7f9')
})

test('hero is dark navy for the corporate block', () => {
  assert.equal(marketing.hero.toLowerCase(), '#0b1220')
})

test('primary CTA radius is sharp, not pill', () => {
  assert.ok(marketing.ctaRadiusPx <= 8)
})

test('CTA hrefs are /signup and /demo', () => {
  assert.equal(marketing.ctas.signup.href, '/signup')
  assert.equal(marketing.ctas.signup.label, 'Sign up')
  assert.equal(marketing.ctas.demo.href, '/demo')
  assert.equal(marketing.ctas.demo.label, 'Book a demo')
})

test('hero names the vacancy outcome, not an operating layer', () => {
  assert.match(marketing.headline.toLowerCase(), /fill a place/)
  assert.match(marketing.headline.toLowerCase(), /evening/)
  assert.equal(marketing.businessEnd, '')
  assert.match(marketing.kicker.toLowerCase(), /registered uk childminders/)
  assert.doesNotMatch(marketing.kicker.toLowerCase(), /operating layer/)
  assert.match(marketing.subhead.toLowerCase(), /inbound enquiries/)
  assert.match(marketing.subhead.toLowerCase(), /vacancies/)
  assert.match(marketing.subhead.toLowerCase(), /replies in your voice/)
  assert.match(marketing.subhead.toLowerCase(), /books the parent for a visit/)
  assert.doesNotMatch(marketing.subhead.toLowerCase(), /qualif/)
  assert.doesNotMatch(marketing.subhead.toLowerCase(), /15\/30/)
  assert.doesNotMatch(marketing.subhead.toLowerCase(), /run in the background/)
  const blob = `${marketing.kicker} ${marketing.subhead} ${marketing.flow.map((s) => s.body).join(' ')} ${marketing.trust.map((t) => t.body).join(' ')}`.toLowerCase()
  assert.match(blob, /your answers/)
  assert.match(blob, /download/)
  assert.match(marketing.tagline, /dot the i/i)
  assert.doesNotMatch(marketing.tagline, /^Dottie /)
  assert.equal(marketing.productName, 'Go Dottie AI Childminder Assistant')
  assert.equal(marketing.navTagline, 'AI Childminder Assistant')
  const auth = readFileSync(join(root, 'app/(auth)/layout.tsx'), 'utf8')
  assert.match(auth, /productName/)
  const header = readFileSync(join(root, 'components/marketing/SiteHeader.tsx'), 'utf8')
  assert.match(header, /navTagline/)
  assert.match(header, /marketing\.brand/)
})

test('invoicing is quiet and funded hours are a payment method', () => {
  const blob = `${marketing.invoicing.name} ${marketing.invoicing.body} ${marketing.subhead} ${marketing.pricingLead}`.toLowerCase()
  assert.match(blob, /add invoicing if you want go dottie to handle this once the child is onboarded/)
  assert.match(marketing.invoicing.body.toLowerCase(), /payment method/)
  assert.match(blob, /approv/)
  assert.doesNotMatch(marketing.flow.map((s) => s.body).join(' ').toLowerCase(), /qualify/)
})

test('pricing cards are Enquiries, Limited and Full, billed once a year', () => {
  assert.equal(marketing.pricingPlans.length, 3)
  assert.deepEqual(
    marketing.pricingPlans.map((p) => p.id),
    ['enquiries', 'limited', 'full'],
  )
  const enquiries = marketing.pricingPlans.find((p) => p.id === 'enquiries')
  const limited = marketing.pricingPlans.find((p) => p.id === 'limited')
  const full = marketing.pricingPlans.find((p) => p.id === 'full')
  assert.equal(enquiries.price, '£160')
  assert.equal(enquiries.cta, 'Sign up')
  assert.equal(enquiries.href, '/signup')
  assert.equal(enquiries.checkout, true)
  assert.equal(limited.price, '£208')
  assert.equal(limited.cta, 'Book a demo')
  assert.equal(limited.href, '/demo')
  assert.equal(limited.checkout, false)
  assert.equal(full.price, '£280')
  assert.equal(full.cta, 'Book a demo')
  assert.equal(full.href, '/demo')
  assert.equal(full.checkout, false)
  const home = readFileSync(join(root, 'app/page.tsx'), 'utf8')
  assert.match(home, /<Pricing/)
  const pricing = readFileSync(join(root, 'components/marketing/Pricing.tsx'), 'utf8')
  assert.match(pricing, /data-pricing-cards/)
  assert.match(pricing, /sm:grid-cols-3/)
  assert.doesNotMatch(pricing, /data-billing-toggle/)
  assert.doesNotMatch(pricing, /\/month/)
  const signup = readFileSync(join(root, 'app/(auth)/signup/page.tsx'), 'utf8')
  const faq = readFileSync(join(root, 'app/faq/page.tsx'), 'utf8')
  assert.match(signup, /PricingCards/)
  assert.match(faq, /PricingCards/)
})

test('public prices are annual and there is no monthly billing toggle', () => {
  assert.equal(pricingAmounts.enquiries.annual, 160)
  const pricing = readFileSync(join(root, 'components/marketing/Pricing.tsx'), 'utf8')
  assert.doesNotMatch(pricing, /Monthly/)
  assert.doesNotMatch(pricing, /£28\.99/)
  assert.doesNotMatch(pricing, /£244/)
  const home = readFileSync(join(root, 'app/page.tsx'), 'utf8')
  assert.match(home, /P1Y/)
  assert.doesNotMatch(home, /bothFrom/)
})

test('homepage uses EmailFlow, dark hero, and dropped old treatments', () => {
  const home = readFileSync(join(root, 'app/page.tsx'), 'utf8')
  const flow = readFileSync(join(root, 'components/marketing/EmailFlow.tsx'), 'utf8')
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8')
  assert.match(home, /EmailFlow/)
  assert.match(home, /marketing\.hero/)
  assert.doesNotMatch(home, /businessEnd/)
  assert.match(flow, /data-email-flow/)
  assert.match(flow, /data-product-window/)
  assert.match(flow, /prefers-reduced-motion/)
  assert.doesNotMatch(home, /from-emerald-600 via-emerald-500 to-amber-400/)
  assert.doesNotMatch(home, /heroIcons/)
  assert.doesNotMatch(home, /#fdf8f1/)
  assert.match(
    css,
    /\.marketing-page\s+h1,[\s\S]*?font-family:\s*var\(--font-nunito\)/,
  )
})

test('trust and fit copy are honest, no fake logos', () => {
  assert.equal(marketing.trust.length, 4)
  assert.match(marketing.trust[0].title, /Place offered/)
  assert.match(marketing.trust[0].body, /space you listed/)
  assert.doesNotMatch(marketing.trust[0].body, /15 and 30 hours/)
  assert.match(marketing.forWho.yes.toLowerCase(), /registered uk childminders/)
  assert.match(marketing.forWho.no.toLowerCase(), /not a parent portal/)
  const home = readFileSync(join(root, 'app/page.tsx'), 'utf8')
  assert.doesNotMatch(home, /logo wall|trusted by 10,000/i)
})

test('hero loop is three beats: draft, vacancy, visit offered', () => {
  assert.equal(marketing.heroLoop.length, 3)
  assert.deepEqual(
    marketing.heroLoop.map((b) => b.id),
    ['reply', 'match', 'book'],
  )
  assert.match(marketing.heroLoop[0].line, /Instant draft/)
  assert.match(marketing.scene.resultLine, /vacancies filled/i)
  assert.match(marketing.scene.resultLine, /admin sorted/i)
  const flow = readFileSync(join(root, 'components/marketing/EmailFlow.tsx'), 'utf8')
  assert.match(flow, /heroLoop/)
  assert.match(flow, /scene\.match/)
  assert.match(flow, /calendarDays/)
  assert.match(flow, /col-start-1 row-start-1/)
  assert.match(flow, /invisible pointer-events-none/)
  assert.doesNotMatch(flow, /scene\.facts/)
  assert.doesNotMatch(flow, /Knowledge base/)
  assert.doesNotMatch(flow, /setTyped/)
  assert.match(marketing.scene.fromMeta.toLowerCase(), /contact form/)
  assert.match(marketing.flow[0].body.toLowerCase(), /does not host the form/)
})

test('hero letter is a warm professional note, not a system phrase', () => {
  const body = marketing.scene.replyBody
  assert.match(body, /Thank you for your email, Emma/)
  assert.match(body, /I look forward to meeting you both/)
  assert.match(body, /Kind regards/)
  assert.doesNotMatch(body, /that is within our visiting hours/i)
  assert.doesNotMatch(body, /that is in my hours/i)
  const flow = readFileSync(join(root, 'components/marketing/EmailFlow.tsx'), 'utf8')
  assert.match(flow, /whitespace-pre-wrap/)
  assert.match(marketing.scene.replyExcerpt, /Thank you for your email, Emma/)
  assert.match(marketing.scene.replyExcerpt, /Kind regards/)
})

test('hero parent email uses days, times and funding, not a total hour count', () => {
  assert.match(marketing.scene.fromBody, /Mon–Wed/)
  assert.match(marketing.scene.fromBody, /8am–6pm/)
  assert.match(marketing.scene.fromBody, /30 hours of government-funded childcare/i)
  assert.doesNotMatch(marketing.scene.fromBody, /grant/i)
  assert.doesNotMatch(marketing.scene.fromBody, /three days, 30 hours/)
  assert.equal(marketing.scene.match[0].value, 'Mon–Wed, 8am–6pm')
  assert.match(marketing.scene.replyExcerpt, /Monday to Wednesday, 8am to 6pm/)
  assert.doesNotMatch(marketing.scene.replyExcerpt, /including 30 hours/)
})

test('visits are disclosed as Gmail Calendar', () => {
  const blob = `${marketing.worksWith} ${marketing.scene.visitChip} ${marketing.flow.map((s) => s.body).join(' ')} ${marketing.heroLoop.map((b) => `${b.line} ${b.note ?? ''}`).join(' ')}`.toLowerCase()
  assert.match(blob, /gmail/)
  assert.match(marketing.worksWith.toLowerCase(), /works with gmail/)
  assert.doesNotMatch(blob, /outlook|apple calendar|any calendar/)
})

test('a homepage refresh starts at the top, not a leftover #invoicing hash', () => {
  const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8')
  assert.match(layout, /RELOAD_TO_TOP_SCRIPT/)
  const script = readFileSync(join(root, 'lib/reload-to-top.mjs'), 'utf8')
  assert.match(script, /scrollRestoration\s*=\s*['"]manual['"]/)
  assert.match(script, /['"]reload['"]/)
  assert.match(script, /replaceState/)
  assert.match(script, /scrollTo\(0,\s*0\)/)
  assert.match(script, /addEventListener\('load'/)
  assert.match(script, /addEventListener\('pageshow'/)
})

test('homepage overflow does not create a scroll container that unsticks the header', () => {
  const home = readFileSync(join(root, 'app/page.tsx'), 'utf8')
  assert.doesNotMatch(home, /overflow-x-hidden/)
})

test('enquiries draft redacts SEN and fail-closes quota before calling the model', () => {
  const grok = readFileSync(join(root, 'lib/enquiries/grok.ts'), 'utf8')
  assert.match(grok, /assembleEnquiryLetter/)
  assert.doesNotMatch(grok, /sen_notes/)
  assert.doesNotMatch(grok, /parentBlockForModel/)
  const draft = readFileSync(join(root, 'app/api/enquiries/draft/route.ts'), 'utf8')
  const post = draft.slice(draft.indexOf('export async function POST'))
  assert.match(post, /runEnquiryDraft/)
  assert.match(post, /failOpen: false/)
  assert.match(post, /burstPerHour/)
  assert.match(post, /burstPerDay/)
  assert.ok(post.indexOf('runEnquiryDraft') < post.indexOf('draftEnquiryReply'))
})

test('proxy fails closed, contact is public, portal returns to profile, privacy does not claim auto-send', () => {
  const proxy = readFileSync(join(root, 'proxy.ts'), 'utf8')
  assert.match(proxy, /\/api\/contact/)
  assert.match(proxy, /\/pack/)
  const catchBlock = proxy.slice(proxy.lastIndexOf('} catch'))
  assert.match(catchBlock, /Unauthorised/)
  assert.doesNotMatch(catchBlock, /return NextResponse\.next\(\{ request \}\)[\s\S]*isProtectedRoute/)
  const portal = readFileSync(join(root, 'app/api/stripe/portal/route.ts'), 'utf8')
  assert.match(portal, /\/profile/)
  assert.doesNotMatch(portal, /\/dashboard\/settings/)
  const contact = readFileSync(join(root, 'app/api/contact/route.ts'), 'utf8')
  assert.match(contact, /escapeHtml/)
  const privacy = readFileSync(join(root, 'app/privacy/page.tsx'), 'utf8')
  assert.doesNotMatch(privacy, /Auto-send is on by default/)
  assert.doesNotMatch(privacy, /does not currently connect to Gmail/)
  assert.doesNotMatch(privacy, /Automatic send is off/)
  assert.doesNotMatch(privacy, /trial reminders/)
  assert.match(privacy, /replies to them automatically from your Gmail/)
  const onboard = readFileSync(join(root, 'app/onboarding/page.tsx'), 'utf8')
  assert.doesNotMatch(onboard, /bank_sort_code: bank\.default_bank_sort_code/)
})
