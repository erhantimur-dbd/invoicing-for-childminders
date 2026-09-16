---
learning: on
require_approval: true
auto_apply_safe: false
learn_from:
  - unanswered_question
never_learn:
  - extra_needs
  - sen_notes
  - funded_not_accepted
  - age_outside
max_pending_per_account: 20
safe_topics:
  - pets
  - school_run
  - food
---

# Dottie Enquiries agent

Learn only **repeatable setting facts** (pets, school run, meals, weekends).
Never store a child's health or SEN as a general FAQ.

A pending card is a question + suggested answer. A human must approve
unless `auto_apply_safe` is true **and** the topic is in `safe_topics`.

This file is the admin policy. Dashboard Approve/Skip cannot weaken `never_learn`.
