# Enquiries — EU AI Act, GDPR and security map

Engineering map of product facts to the obligations the Enquiries draft path is built against. This is not a legal opinion.

## EU AI Act

Parent letters are written in the childminder’s voice. The code constant `ARTICLE_50_DECISION` in `src/lib/enquiries/draft-prompt.mjs` is `keep_human_approved_mary_letters`: Article 50 transparency is handled by keeping a human in the loop, not by stamping “AI” on the parent email.

Auto-send is the default (`send_mode` `auto`). The childminder can switch to Draft & approve, or pause. Pause blocks Gmail polling, drafting, and sending. When the model flags a thread (`needs_human`), the draft is saved and not sent, and the childminder is emailed. That is the human oversight path.

## GDPR

Only classified parent-enquiry mail is stored. Receipts, newsletters, and other non-enquiry mail are never stored.

Extra-needs / SEN notes can be health data (UK GDPR Article 9). They stay on the prospect for the childminder. `senNotesForModel` redacts them before the prompt is built, so those notes are not sent to the model.

Drafting uses **xAI (Grok)** as the primary processor. If xAI is unavailable in production, drafting may fall back to **Anthropic (Claude)**. The reply itself is sent from the childminder’s Gmail (`gmail.send`), not by xAI or Anthropic. Enquiry content needed for that draft may be transferred to the United States. The privacy page records Google and Anthropic locations as USA where Standard Contractual Clauses (SCC) apply, and lists xAI as a USA processor.

Gmail connect requests `gmail.readonly` and `gmail.send` only. It does not request `calendar.events`.

## Security

Draft quota is fail-closed. `createEnquiryDraft` calls `rateLimit` with `failOpen: false` on the `enquiry-draft-hour` and `enquiry-draft-day` buckets (`burstPerHour`, `burstPerDay`) before `runEnquiryDraft` calls `draftEnquiryReply`. A usage count that cannot be read is treated as over the cap (`failClosedUsageCount`), not as zero. Gmail refresh tokens are encrypted at rest. Public routes, including `/`, do not construct a Supabase client.
