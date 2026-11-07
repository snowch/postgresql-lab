# Navigation and complete curriculum review

## UX review

The supplied tablet screenshot showed the fixed rail using a large fraction of the available width.
The chapter rail is now 224px on wide desktops and can be hidden using Chapters. Below 1200px it
starts closed and opens as an overlay drawer, leaving the reading column its width. Escape or the
backdrop closes the drawer. Hidden navigation is inert, and Escape returns focus to the toggle.
The database toolbar is in normal flow on phones so it cannot cover lesson paragraphs.

An in-page section list makes longer lessons easier to scan. Server examples are copyable panels
labelled with the destination session; they cannot accidentally start the browser engine. Browser
examples retain editable SQL and adjacent output. Wide results scroll inside their panel.

Validation covers 390px phones, 820px and 1024px tablet widths, and 1280px desktops. It checks the
closed tablet state, reading width, toggle, Escape, output overflow, and server/browser separation.
Screenshots are captured for inspection, in addition to execution checks.

## Learning design review

Chapters 4–11 now have executable browser investigations. Chapters 12–18 have ordered real-server
schedules, with an isolated Compose environment, session setup, expected errors, rollback, and
cleanup. Every chapter includes an incident, goals, prerequisites, predictions, evidence to inspect,
a hint, a worked explanation, a transfer task, and primary documentation.

The server suite executes the published session schedules and shell commands, checks actual lock
waiting before observation, and verifies invariants after serialization, concurrent updates, index
creation, logical restore, paused/resumed WAL replay, and promotion. Each chapter starts from a fresh
schema. Browser SQL runs in order and includes semantic checks for constraints, aggregates, partition
membership, row-version updates, vacuum row preservation, and the growth fixture.

## Scope and limits

These are focused investigations. The recovery lesson performs a logical restore and explains PITR;
it does not claim to configure continuous archiving. The standby is a separate server process in one
container, so it teaches transport/replay/promotion without claiming failure-domain isolation or safe
automatic failover. The capstone reproduces independent plan and blocking causes without claiming
production load or latency-percentile measurements. Server commands run through local Docker/psql,
not through a hosted backend attached to the site.

A fast checkpoint is requested for the disposable standby's base backup so the teaching setup does
not wait for a spread production-style checkpoint. This is fixture setup behavior, not general backup
tuning advice. The test server reports PostgreSQL 17; record its exact patch version when comparing.

## Verified results

- 24 rendered pages with local links checked.
- 13 engine/content SQL tests passed, including new semantic assertions.
- 17 Chromium tests passed, executing every browser lesson and the responsive navigation journey.
- All seven real-server chapter schedules passed on PostgreSQL 17.11.
- Tablet, phone, and desktop screenshots inspected; the tablet rail is closed and reading space is restored.

The reviews were performed in one agent session; no independent audit is claimed.
