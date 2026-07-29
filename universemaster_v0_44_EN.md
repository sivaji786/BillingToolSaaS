# universemaster_EN.md — [Studio / Universe: FILL IN]

> **As of:** 2026-07-14 · **Version:** v0.44-EN (derived) · **Maintained by:** Bernhard Hnida (author/technical review)
> **THIS IS THE TRANSLATED EDITION — DERIVED FROM THE GERMAN MASTER.** This English file is a **generated translation artifact derived from the German master document `universemaster_v0_44.md`**. The German document **is the master for this English edition**: it is the sole lead version and the one source of truth; every content change begins in the German master, never here. **In any case of doubt or divergence, the German version prevails.** This file is **regenerated** with every new German version and **never edited independently** ("reference instead of copy, generation instead of hand-maintenance", §18; bilingual rule §2 v0.34; derivation checked by the EN-derivation sentinel, §6 of the German master).
> **Translation status:** §0–§2 and §10–§19 fully translated · §3–§9 pending (marked stubs — see German master) · Changelog/Provenance/Duplicates remain German-only (historical record).
> **Terminology map (DE → EN, binding):** Regelkreis = control loop · Pflege-Rolle = caretaker role · Trenntest = disconnection test · Freigabe = approval/release · Bezeugung = human attestation · Wiedervorlage = follow-up date · Sentinel = sentinel (check gate) · Avatar = avatar (advisory perspective) · Kronjuwelen = crown jewels (core IP) · Weisungs-Naht = chain-of-command seam · [HART]=[HARD] · [STANDARD]=[STANDARD] · [KONVENTION]=[CONVENTION] · [OFFEN]=[OPEN].

---

## 0 · Usage (Meta)

**Where things belong**
- Sections tagged `[GLOBAL]` → Settings → profile preferences. Keep short.
- Sections tagged `[PROJECT]` → as individual files into the project knowledge base (`.md`/`.txt`/`.json`, **no ZIP**).
- If a `[GLOBAL]` section changes, it must be re-synced once into the profile preferences. The changelog (German master) shows whether a copy is stale.

**Status legend** (every rule/line carries its status)
- `[HARD]` — immovable, never optimizable away (e.g. human-rights/safety boundary)
- `[STANDARD]` — default; deviation allowed with stated justification
- `[CONVENTION]` — style/form matter
- `[OPEN]` — not yet decided / FILL IN

**Testability** — Golden rules are phrased so that a sentinel could evaluate them *true/false*.
Not: "We work cleanly." But: "No merge without green sentinel X **and** approval by role Y."

**Status of this document — source *and* operational prompt.** The `.md` is the **source of truth** and is written *testably*; the actual prompts are **distilled** from it. It **only works when loaded as a binding checklist during building and worked through rule by rule** — not when merely "understood". Binding means: **every deliverable proves that every applicable rule is implemented** (§2 "rule-coverage evidence"). A rule that was understood but not worked through counts as **not** applied.

---

## 1 · Collection & Maintenance Prompt (invocable — does NOT run by itself)

> Paste the following block into the chat and say: **"Run the collection prompt on universemaster.md."**

```
TASK: Update universemaster.md from the current chat.
1. Extract everything generic/reusable (rules, roles, rights, standards,
   conventions, do-NOTs) — nothing project-specific unless I say so explicitly.
2. Assign each element to the matching section (§1–§19).
3. Tag each element: [GLOBAL]/[PROJECT] and [HARD]/[STANDARD]/[CONVENTION]/[OPEN].
4. Phrase golden rules testably (sentinel-checkable).
5. Detect duplicates/contradictions with existing content and REPORT them
   instead of entering them twice.
6. Bump the version, set the date, extend the changelog.
7. Return the COMPLETE new universemaster.md (not just the delta).
8. CONTINUE the ToDo list at the end of the file, do not replace it: mark done
   items [x], append new open items, leave the rest unchanged.
9. Keep categories separate: avatars (§7, embodied perspective) are NOT
   sentinels (§6, machine gate) — never mix them.
INVENT NOTHING: if information is missing (stack, languages, avatars,
sentinels), mark it [OPEN].
```

**Everyday short form** (when the file is already in the project):
> "Collection prompt on universemaster.md, return the full file."

### 1.2 · The Author's Role Prompt  [GLOBAL] `[STANDARD]` (v0.23)

*(Second invocable prompt. Use as project instruction, system prompt, or preamble of every new working session — defines **who the author is and how every AI/tool must work with him**. German is the lead version; the English version below is structurally identical. Binding reference file: `ROLE_PROMPT_Product-Designer-Visionary.md`.)*

```
ROLE OF THE PRINCIPAL
I am not a coder. I am a detailed product designer, visionary, and evangelist.
My job is to describe the system in as much detail as possible — concept, behavior,
logic, effect. Technical implementation is done by others (my team or the AI itself).

WHAT THIS MEANS FOR YOU (AI)
1. SPEC BEFORE CODE — full description/specification/design intent first; code after,
   never first; if code, then as a finished, self-contained result.
2. MAXIMUM DEPTH OF DETAIL — describe systems, flows, states, roles, data paths and
   edge conditions exhaustively; never shortcut anything as "trivial".
3. EXTRAPOLATE DESIGN INTENT — I communicate tersely and directively; derive the full
   intent from minimal input, think it through, present for approval.
4. NO DEVELOPER JARGON AS A BARRIER — always explain technology as product/system
   behavior; technical terms welcome, but explained and consistent.
5. TERMINOLOGY DISCIPLINE — defined terms are binding (locked); no synonyms, no silent
   deviation; corrections apply permanently and retroactively.
6. ONE TOPIC — ONE CONTEXT — keep workstreams cleanly separated; no foreign
   assumptions without approval.
7. FORM OF RESULTS — complete, self-contained documents or single-file applications,
   handoff-ready, no external dependencies, bilingual DE/EN (German as master),
   unless instructed otherwise.

GUIDING PRINCIPLE: "Everything configurable, nothing required to configure."
```

*Testable:* "Every [mn]universe project/tool with AI participation carries this role prompt in its instructions; a deliverable violating spec-before-code, terminology discipline, or the form of results is a deviation against §1.2."

---

## 2 · Golden Rules            [GLOBAL]

*(from the glass-case chat — base v0.1)*
- `[HARD]` Human-rights, legal and safety boundaries are **constraints, not weights** — never optimizable away.
- `[HARD]` No invented precision. No invented prices/figures/sources.
- `[STANDARD]` Assumptions and simplifications are **disclosed** (completeness statement: shows / fixes / missing).
- `[STANDARD]` Every important statement carries its **evidence status** (definition/derivation/empirical/hypothesis/normative/…).
- `[STANDARD]` "Open" is not a dead end: follow-up, escalation, or parking — never simply left lying.
- `[STANDARD]` The human decides **value and boundary**; the machine delivers overview and proposals.
- `[STANDARD]` Automatic execution only where no rights are touched; otherwise a **request** for human decision.
- `[CONVENTION]` When unclear, ask rather than guess.

*(from the Kö team-building chat — v0.2)*
- `[STANDARD]` **One source:** Every master-data record has exactly one storage location; no second, divergently editable copy exists. *Testable:* "Exactly one location per master record; if the sentinel finds a second editable copy → fail."
- `[STANDARD]` **Prefer the superordinate source:** If a record exists in the superordinate structure, it is adopted rather than duplicated locally; local creation only if absent above. *Testable:* "Record exists above and is duplicated locally → fail."
- `[STANDARD]` **Role gate for master data:** Write access to master data only with the matching role. *Testable:* "A write without role X is not executable."
- `[STANDARD]` **Default pass-through + approval gate:** Processes run without prompts as long as no check objects; an externally effective result only comes into being after explicit approval by the entitled role; any later change resets the approval. *Testable:* "No outgoing result (document/message/dispatch) without prior approval; after a change the approval status is false again."
- `[STANDARD]` **Outputs from one confirmed state:** All outputs (document + accompanying messages) derive from the same confirmed state and cannot diverge. *Testable:* "Document and messages reference the same state ID."
- `[STANDARD]` **Demo labeling:** Demo/sample artifacts are visibly marked "Demo / fake data" and contain only fictitious placeholders, no real personal data. *Testable:* "Every demo artifact carries the visible demo notice; no real personal data."

*(from the Kö team-app / matchday chat — v0.3)*
- `[STANDARD]` **Proposal ≠ decision (visible):** An algorithmic proposal only becomes binding when the entitled role explicitly confirms it; affected people always see the visible status "proposed" vs. "confirmed". *Testable:* "Every proposal visibly carries proposed/confirmed; 'confirmed' only after action of the entitled role."
- `[STANDARD]` **Justified automation:** Every algorithmic ranking/decision openly shows its **reasoning** (which factors, in which order). *Testable:* "For every proposal a machine-generated justification is visible."
- `[STANDARD]` **Disclosed decision factors:** Ranking/selection algorithms use exclusively (a) stored **personal preferences**, (b) documented **history** (performance/behavior), and (c) stored **risks** — no hidden criteria. *Testable:* "Factors used are named and stem from (a)/(b)/(c)."
- `[STANDARD]` **Neutrality in sensitive allocations:** Conflict-prone selection/allocation decisions run via **documented, pre-agreed rules** instead of individual discretion; the rule is inspectable — nobody becomes the scapegoat. *Testable:* "Each such decision references an inspectable rule."
- `[HARD]` **Safety before engagement:** The product offers **no feature that incentivizes dangerous or unlawful behavior** (e.g. speed/arrival races in traffic). Risky suggestions are removed/blocked; where relevant a legal warning is shown. *Testable:* "No feature/suggestion matches the deny-list of forbidden patterns; a warning exists where relevant."
- `[STANDARD]` **Cooling-off for irreversible personal decisions:** Emotionally charged, hard-to-reverse actions (e.g. resignation) get a **cool-down** and a "talk first" path before taking effect; cancellation is possible at any time. *Testable:* "Action confirmable only after the cool-down; cancel always available."
- `[STANDARD]` **Fairness/participation when the outcome is fixed:** If the result is immovably decided (or irrelevant), allocation prioritizes **participation** (those little considered so far) over pure performance. *Testable:* "In the 'result fixed' state, under-used members are allocated preferentially." *(Generalizable to allocation/scheduling contexts.)*
- `[CONVENTION]` **Never expose anyone:** Social features avoid shaming/exposing individuals; friction points are defused, not amplified.

*(from the [mn]medianet / SCLAN 5.0 chat — v0.4)*
- `[HARD]` **Development time ≠ runtime (no compiler in the field):** Systems are designed so end users and installers need **no developer toolchain** (compiler, build system, IDE). Configuration happens via runtime mechanisms (protocol frames, UI, API). *Testable:* "No field installation step requires a compiler, build call, or developer login."
- `[STANDARD]` **Three-column make-or-buy:** Every build-vs-adopt decision presents three options as equals: (A) adopt a proven standard · (B) AI-generate · (C) hand-write. The AI option is assessed **honestly** — the spec is the human effort; verification/test/fuzz thresholds are not lowered; real-hardware bench remains mandatory. *Testable:* "Every make-or-buy recommendation contains all three columns."
- `[HARD]` **Injection protection — all five vectors:** Every system with structured text input protects against (V1) SQL/ORM injection via parameterized queries, (V2) XSS via output escaping at render time, (V3) prompt injection via strict parser before the AI layer, (V4) mass assignment via explicit tag allowlist, (V5) schema-row injection via the same allowlist. *Testable:* "A test case exists and passes for all five vectors."
- `[HARD]` **Cryptographic provability instead of policy trust:** Security promises are enforced by technical mechanisms, not policy documents: signing, encryption at rest, encryption in transit, immutable audit trail. *Testable:* "Every security promise is enforced by a technical mechanism, not just a policy."
- `[STANDARD]` **Risk-proportional key rotation:** Rotation frequency = f(privilege tier × activity level); timing is chosen **randomly** within the window (no predictable date). *Testable:* "Every key carries a computed valid_until within the tier's min/max; not bound to a fixed calendar slot."
- `[STANDARD]` **Grace-period overlap on rotation:** On key/token changes the old key stays valid for a defined grace period so running operations are not interrupted. *Testable:* "After issuing a new key an overlap window exists; only after it expires is the old key invalidated."
- `[STANDARD]` **Forensics through audit trail:** Every writing operation (create/update/delete/login/rotation) produces a signed, immutable audit entry with: actor ID, role at the time, key fingerprint, action, object before/after hash, IP, timestamp (ms precision). *Testable:* "Every write produces an audit entry verifiable via the actor's signature; a modified entry breaks the signature."

*(from the SCLAN STM32/gateway chat — v0.11 — embedded/hardware release rules)*
- `[HARD]` **SCLAN core function stays decentralized and server-independent:** A SCLAN module fulfils its intended core function without internet, cloud, SCLAN server, or web GUI. Server/gateway visualize, log, integrate, and parameterize; they are no hidden functional single point of failure. *Testable:* "In the acceptance test, internet, server and gateway are disconnected; the defined local core function and bus communication persist or enter the documented safe state." *(= the original **disconnection test** figure — see §10 AI disconnection test, §13 supplier disconnection test.)*
- `[HARD]` **No invented hardware assumptions:** MCU, enclosure, board revision, schematic, pinout, levels/polarity, supply, reset, clock source, electrical limits come from approved sources; unknowns stay `[OPEN]`. Photos may hint, never replace a schematic. *Testable:* "Every configured hardware parameter references schematic/pin list/datasheet incl. revision; unfilled values block hardware release."
- `[HARD]` **Safe state before useful function:** For power-on, reset, brownout, watchdog, bus loss, comms loss, and incomplete initialization, a safe state is defined and physically tested per output/actuator. *Testable:* "Every named fault state has expected outputs and a passed test record; if one is missing, release stays blocked."
- `[HARD]` **Re-entry and recovery preserved:** SWD/reset or an equivalent documented recovery path stays reachable until deliberate release; locking requires a verified replacement/recovery/rollback procedure. *Testable:* "A deliberately faulty test image can be recovered on target hardware without replacing the controller."
- `[HARD]` **End-to-end / bottom-to-top testing:** Hardware, firmware, SCLAN BUS/BLE/WLAN, gateway/server, API and web GUI are tested as a complete chain of effect, not only in isolation. *Testable:* "Each releasable core function has at least one passed test with stimulus at the real start and observed real end effect; pure unit/mock tests do not suffice."
- `[HARD]` **No hardware release without the prescribed test routine:** Compiling and unit tests are necessary, not sufficient. Release only after documented electrical, functional, timing, fault, recovery, endurance, and system-chain tests on the defined board revision. *Testable:* "The release object contains result, measurement, DUT ID, firmware state, tester and timestamp per mandatory test class."
- `[HARD]` **Matching test routine, no universal test:** Multiple versioned test routines exist per module type/revision/variant; the matching routine is selected deterministically before test start; 0 or >1 matches = no test start.
- `[HARD]` **Sequence testing makes channel faults audible and visible:** Multi-channel outputs are driven in a fixed repeatable order; relays produce a characteristic switching sequence, LED channels running-light/color sequences; optional per-channel acoustic feedback makes failure, sticking, or swapping audible. *Testable:* "Routine and target sequence are versioned; every channel appears exactly at its target position with the expected optical/acoustic event."
- `[STANDARD]` **Two permitted visual verification paths:** (A) **without camera:** a trained human attests the defined sequence at the test bed; (B) **with camera/sensors:** image/audio evaluation confirms the same target events and stores raw evidence. The test routine states which mode is required (`verification_mode=human|camera_ai`). *(This human-fallback pattern is reused by §10 "the gate stays, the checker changes".)*
- `[STANDARD]` **Fast same-color check of multicolor LEDs only with a validated procedure** (validated speeds/colors/criteria; slower unambiguous phases where perception cannot safely exclude defects).
- `[STANDARD]` **Mark faults directly at the affected channel:** long-press (default ~2 s) marks the active channel defective, binds channel/DUT/routine/step/fault/tester/timestamp, and blocks "pass"; a short press marks nothing.
- `[STANDARD]` **Firmware, configuration, hardware, and test evidence form one state:** every release binds board/schematic revision, MCU/package, CubeMX `.ioc`, source commit, toolchain/SDK version, build artifact/hash, parameter state and test report to one release ID; any relevant change resets affected releases.
- `[STANDARD]` **Camera/AI verification bay as designated evidence slot:** the test architecture reserves an extensible interface for camera/microphone/sensors; until procedures, thresholds, calibration and cross-checks are defined it stays `[OPEN]` and never replaces human release.
- `[STANDARD]` **Supported operating systems are a release matrix, not a wish:** every declared combination (macOS/Windows/Linux/SBC-Linux × architecture) is built, installed, started, updated and end-to-end tested; untested combinations are not called "supported".

*(from the [mn]universe command-language / importer block — v0.12/v0.13 era)*
- `[STANDARD]` **Clipboard as universal importer:** Systems with bulk data entry accept structured text from the clipboard (Excel, Word, CSV, TSV) without a dedicated import dialog when the **first line names the columns via command tags** (schema line). *Testable:* "A correctly formatted schema+data paste creates the expected objects; a row without schema match creates none."
- `[STANDARD]` **Universal command language — everywhere:** Every input field additionally accepts the system's own command language (tag syntax `+Tag: value`) — human-readable, AI-friendly, machine-parseable, voice-input capable. *Testable:* "A `+T: task name` string in any input field creates a task object without further clicks."
- `[STANDARD]` **Command bar at page bottom — always visible:** every page carries a persistent command bar at the bottom, never hidden behind menu/toggle, with a rotating example hint.
- `[STANDARD]` **Strict parser before AI layer:** Structured input (correct tag syntax) is parsed deterministically without AI. The AI layer activates **only** for free-text/voice fallback and produces a validated schema object — no direct database operations. *Testable:* "Valid tag input passes the strict parser and never reaches the AI layer; the AI layer has no direct DB write access."
- `[STANDARD]` **Time-zone care — three contexts:** personal (per user), project (per case), customer/counterpart (per customer record); all three with sensible defaults, none empty without an explicit emptiness decision.
- `[STANDARD]` **Local time behind person names:** wherever people appear in a shared time-related view, their TZ abbreviation + local time is shown behind the name when it differs from the viewer's.
- `[HARD]` **Finance/legal-advice disclaimer:** Every document, UI page, and generated report containing financial, tax, or legal figures carries a **visible, non-dismissible** notice: "Not legal or tax advice — orientation only. Consult a professional." *Testable:* "Every finance/legal output artifact contains the disclaimer visibly."
- `[STANDARD]` **Conditions inquiry ≠ credit inquiry (banking):** Preliminary bank inquiries for interest rates are labeled as **conditions inquiries** (credit-score-neutral), never as credit applications; the difference is stated explicitly in the letter.

*(from the Staufenberg / compliance-gate chat — v0.5)*
- `[HARD]` **Go-live gate (compliance gate):** A system with legally mandatory disclosures (imprint, privacy statement, register data) must **not switch to production mode while defined mandatory conditions are unmet**. The check is a **hard, non-configurable gate at the mode switch** — no passive notice, no dismissible checklist. If a blocker fails, production mode does not start; a maintenance/blocked page with the reason is served. *Testable:* "On switching to `production` the mandatory-disclosure register runs; at least one open blocker → no production mode, blocked page with named reason."
- `[HARD]` **Active enforcement instead of passive placeholder (display ≠ gate):** A placeholder or checklist that only *shows* what is missing is **no protection**. Legally or safety-critical gaps must **actually block** an executable action (deploy, dispatch, mode switch). A gate bites at the execution point, not in a view someone must look at. *Testable:* "For every gap marked critical there is a gate that truly refuses the action; a display without blocking effect is a deviation."
- `[STANDARD]` **Human attestation as a field, not a formalism:** Where software **cannot verify correctness itself** (e.g. legal accuracy of a text), the artifact carries a field **"checked/approved by ‹person› on ‹date›"**. The software attests only the *presence* of this human approval — the human vouches, the software records it. *Testable:* "Every legally/professionally review-mandatory text carries a filled approved-by/on field; if missing, status ≠ approved and the gate stays shut."

*(from the Staufenberg mockup chats — v0.7)*
- `[STANDARD]` **Offline single file without server assumptions:** A deliverable runnable by double-click (`file://`) must make no runtime assumption valid only under `http(s)://` (in-memory client router; no absolute root paths as real navigation). *Testable:* "Opening under `file://` produces no runtime error; internal navigation never leaves the file."
- `[STANDARD]` **Safety net when the app has not started:** Until the app reports "ready", an app-independent brake intercepts every internal navigation instead of letting the browser jump away.
- `[HARD]` **Visibility is not security (hiding ≠ gate):** A menu-hidden but still reachable area is unprotected. Role-dependent areas are additionally enforced **at the route**: direct access without entitlement returns a refusal, not the content. Server-side checking is binding; the UI merely mirrors it. *Testable:* "Direct call of a protected route without entitlement returns the refusal; a missing menu link does not count as protection."
- `[STANDARD]` **Ticket/report routing by category (one source):** Where a report (bug/idea/question) goes is decided by its category via **one** central routing table (category → responsible role/team → channel → escalation). *Testable:* "Every report category has exactly one target entry; the form shows the target before sending."
- `[STANDARD]` **Target transparency before sending:** whoever submits a report sees **beforehand** which role/team receives it.
- `[STANDARD]` **Data-minimal role scopes (tech ≠ business):** A technical role (e.g. developer) gets system state, logs, and error pictures — **not** personal business data. Rights are explicitly set per role, never regulated by omission. *Testable:* "Every area right is explicitly set per role; the technical role has no read right on personal business data."
- `[HARD]` **Status change via e-mail only verified:** A state change arriving over a forgeable channel is **never** adopted from message text alone. Binding: signed action link (HMAC) **or** verified sender of a known account (SPF/DKIM/DMARC). Messages from unknowns create only a thread entry, never a status change or rights extension.
- `[STANDARD]` **Case binding via two independent anchors:** an e-mail-driven case binds the case number redundantly to **subject** (`[REF] …`) **and** reply address (sub-addressing `local+REF@…`, RFC 5233); one sender mistake never destroys the mapping.
- `[STANDARD]` **Low-threshold channel first (no forced login):** for reports from customers/externals a path without an account is offered (start via e-mail); form and e-mail path rank equally.
- `[STANDARD]` **Language choice from expressed will, not IP geolocation:** start language follows stored preference > device language; IP serves security only (rate limit/audit), never language/content steering.
- `[STANDARD]` **Automation never locks anyone in:** after automatic language switch a notice **in the chosen language** offers a one-click way back; a deliberate choice permanently beats automation.
- `[STANDARD]` **Translation completeness enforced (structure = lead language):** all language files are generated/checked from **one** lead-language structure; a missing key in any language fails the build (instead of silently falling back).
- `[STANDARD]` **Readability without destroying imagery:** text on images is made readable via local means (tight text shadow, targeted gradient, calm zones) instead of dimming the whole picture; contrast ≥ 4.5:1.
- `[STANDARD]` **Verification on the delivered artifact, not the source:** claims about the deliverable are checked against the **built/delivered** file.
- `[STANDARD]` **Import/reference consistency before delivery:** every UI part used is imported/defined; runtime "is not defined" = fail.
- `[CONVENTION]` **Name your own process mistakes openly**; **clean output state** (dated deliverable names, visible build stamp).

*(from the Staufenberg status-report chat — v0.8, deliverable consistency & translation)*
- `[STANDARD]` **Status report: one status per element, legend covers exactly the occurrences.** *Testable:* "Every element has exactly one status from the set; legend set = actually used set; no orphan legend."
- `[STANDARD]` **Aggregate figures derived from the individual statuses (one source):** counters are computed from element statuses, never hand-maintained beside them.
- `[STANDARD]` **Fact corrections propagate to all occurrences:** item **and** aggregate **and** legend **and** prose; no stale status survives anywhere. 
- `[STANDARD]` **Provenance fidelity for claimed sources:** a value labeled "from source X" is verified against exactly X; if absent there, its true provenance is disclosed — never invented.
- `[STANDARD]` **A translated deliverable mirrors the lead version 1:1 (only the language differs):** same sections, elements, statuses, order. *Testable:* "Translated and lead version have equal section/element/status counts." *(This very file follows that rule; untranslated stubs are declared, see header.)*
- `[CONVENTION]` **Preserve legal/technical terms in translation; never translate proper names/brands** — keep the original with a short gloss (e.g. "Grundschuld", "Impressum").

*(from the document & calculation translation chat — v0.9, computational artifacts)*
- `[STANDARD]` **Translating a computing artifact: text only; formulas & values untouched.** After the change, full recalculation yields the same derived values and zero errors (`#REF!`/`#DIV/0!`/…). *Testable:* "No formula cell overwritten; recalc = 0 errors and baseline-equal values."
- `[STANDARD]` **Reference integrity on rename (rename propagation):** renaming a referenced container (sheet, section ID, key) atomically updates all references; broken references after the operation = 0.
- `[STANDARD]` **Translate embedded text literals too** (user-visible strings inside formulas/templates/code) — no source-language fragment survives.
- `[STANDARD]` **Check input existence, never assume it:** before processing a named input artifact its availability is verified; if missing, the gap is reported openly and work continues with what exists — content is never invented.
- `[STANDARD]` **Transformation guard: actively protect foreign element classes:** a transformation meant to change exactly one element class refuses (fail-safe assertion) access to every other class.

*(from the [mn]universe server introduction & currency duty — v0.10)*
- `[HARD]` **Currency/legal-state duty (no silent stale state):** Products whose results depend on law, tax, or administrative values must not silently keep computing on an outdated legal state. The stored value set carries a **check date**, verified at short intervals (weeks); a detected deviation raises a **visible alarm** and marks affected values "update required"; "current" values are **never invented**. *Testable:* "Every law/tax-dependent value set carries check date ≤ interval; open legal trigger → alarm set."
- `[CONVENTION]` **Look-ahead versioning (year/next year):** products with year-dependent legal values are versioned "YY/YY+1" (e.g. 2026 → "26/27") so the coming edition is named before the year starts.

*(consolidated in v0.12 — [mn]universe/Mares strand)*
- `[STANDARD]` **Category-correct currency alerts (three tracks):** the currency check continuously watches (1) legislation, (2) case law, (3) tech-stack versions per profile — each routed to exactly one recipient (legal tracks → Master of the Universe, tech tracks → server crew). No alarm without exactly one recipient.
- `[STANDARD]` **Inline creation on entitled pick lists ("new entry" first):** every master-data pick list offers, for roles **with** write rights, a "new entry" option as the first item, creating in place into the one source; roles **without** the right see no option **and** the endpoint refuses (route guard) — not merely hidden.
- `[STANDARD]` **Demo roles freely switchable (demo mockups only):** in demo-labeled mockups all defined roles can be assumed to demonstrate the rights matrix and route guards; the switcher exists only in the demo build — in production the role comes exclusively from authentication.

*(from Mares — process control loop on quick creation — v0.13/v0.14/v0.15)*
- `[STANDARD]` **Quick creation starts a completion process (closed control loop):** an inline creation deliberately captures only what is needed at that point; the record gets status "incomplete / in process", the missing rest becomes task(s) with deadline in the responsible role's to-do list (e.g. new employee → HR onboarding), escalating on expiry; the case closes only on receipt confirmation. *Testable:* "Every inline creation produces (a) incomplete-status record, (b) at least one deadline task at the responsible role, (c) an escalation path; a stranded incomplete record without a process task is a deviation."
- `[STANDARD]` **Creation initiable from anywhere; approval/completion via the process:** initiating is open to all roles with functional access to the case (not only write-entitled ones); the created record is provisional and never used as confirmed master data before the process task is receipted.
- `[STANDARD]` **"From anywhere" ≠ "everyone by default" — the initiator circle is covered by the catching process:** who may initiate a given creation is a conscious decision per record type; the permissible circle is as wide as the downstream process reliably catches and corrects errors — where it does not, the circle stays narrower. Documented per "new" option: who may initiate, and which process/role catches errors.

*(from Mares — routing & escalation — v0.16/v0.17)*
- `[STANDARD]` **Routing resolves to a staffed role; unstaffed/absent ⇒ deputy/escalation (no task at an empty role):** every assignment resolves to an actually staffed person; if the responsible role is unstaffed or absent, a documented deputy/escalation chain applies up to a guaranteed staffed instance (ultimately Master of the Universe). A task never rests at an empty role.
- `[STANDARD]` **The top is guarantor of last resort, not a routine recipient:** the escalation chain first exhausts all staffed or designated intermediate roles and deputies; routing straight to the top happens only when no other role is staffed or designated.

*(from Mares — deliverable gates — v0.18/v0.19)*
- `[HARD]` **The deliverable gate runs the complete applicable sentinel set (no curated selection):** before delivery of a mockup/app, **every applicable** sentinel runs (all `[HARD]` plus every one whose rule applies in the deliverable). A missing applicable sentinel in the check rail is itself a deviation. Avatars are review duties, not decoration.
- `[HARD]` **Rule-coverage evidence before every delivery:** every deliverable produces a coverage table mapping each applicable golden rule (§2) and standard (§5) to its implementation location — or an explicit justified "not applicable". An applicable but unmapped rule blocks delivery. The `.md` is a checklist to be worked through, not a text to be read.
- `[STANDARD]` **Proactive professional-advisor feedback loop:** for law/tax/domain-dependent results, advisors are actively asked for feedback as soon as need is recognizable — a dedicated report category (professional question/feedback → Lex/advisors), closed as a control loop (deadline, escalation, receipt).

*(from the deployment automation chat — v0.20, deployment governance WEB/SERVER)*
- `[STANDARD]` **No manual production intervention (one source for code & schema):** every change to a WEB/SERVER production system — backend code, frontend static build **and** database schema — is traceable to exactly one pipeline run with commit ID. The repository is the one source; the production server is a derived copy never edited by hand. *Testable (sentinel):* "Every production change (file hash/schema state) has exactly one pipeline run with commit ID and timestamp; a change without pipeline provenance → fail."
- `[STANDARD]` **Schema only via migration:** every DB schema change exists as a versioned migration script in the repo, paired with the code change needing it; the pipeline applies migrations automatically, in order, with a rollback path. Production schema == sum of applied migrations at all times; drift is detected and reported.
- `[STANDARD]` **Deploys are atomic, tested, and rollback-capable:** a production deploy is a gate process: it runs only after migrations pass on staging, the automated test suite is green, and the frontend build succeeds; it becomes effective atomically (old version keeps running until the switch) and has a rollback path (code **and** database) verified before the deploy. A failed step blocks the deploy — no mixed state.

*(from the deployment/demo governance chat — v0.21, demo header band)*
- `[STANDARD]` **Demo header band: labeling + role choice belong visibly at the top of every page:** every demo artifact carries on **every page** a persistent full-width top band: **left** the unmissable demo warning ("DEMO — all fake data only!!"), **right** the labeled **demo role picker** ("Demo role: [active role ▾]") offering **all roles defined in the artifact (§3)** and showing the active one. Contrast ≥ 4.5:1; exists **only in the demo build**. A small footer badge or a picker hidden in settings does **not** satisfy the rule. *Testable (sentinel):* "Every rendered page shows the band with (a) warning left, (b) picker right with visible active role, (c) option set == defined role set, (d) contrast ≥ 4.5:1; a role switch takes effect immediately; the production build contains no band."

*(from the deployment/demo/IP-protection chat — v0.22. Details: §9.)*
- `[HARD]` **Showcase ≠ blueprint (staged disclosure):** public marketing of a module speaks exclusively in **WHAT/BENEFIT** language; the **HOW** (architecture, algorithms, data models, production source) leaves the house only via the disclosure stages in §9 (stage 3 only after NDA/engagement with attestation field). What is not delivered cannot be stolen — the only absolute protection; everything else (license, watermark, encryption) is deterrence and evidence, not a wall. *Testable:* "No publicly accessible artifact contains production business logic, architecture internals, keys, or confidential project names; every stage-3 handover carries an approved-by/on field."
- `[STANDARD]` **No-code delivery as default (model A):** the standard way to make a module experienceable is the **hosted trial tenant** — the prospect tries the real product in the browser; no code leaves the server. Local delivery (model B: activated appliance) and facade-demo download (model C) are conscious per-module exceptions with a documented author decision (§9). *Testable:* "Every marketed module documents its delivery model (A/B/C); default without entry is A."
- `[STANDARD]` **Per-recipient marking of delivered evaluation artifacts:** every artifact delivered to a lead (facade demo file, appliance package) carries a visible license/copyright notice (evaluation only, no redistribution, no derivation) and a recipient-bound marking (lead ID + date, visible in the footer and machine-readable), so a surfacing copy maps to exactly one recipient. Delivery without both is blocked.

*(from the agents / digital twins / escalation chat — v0.24)*
- `[HARD]` **Agent ≠ avatar ≠ sentinel ≠ responsible human:** An **agent** pursues a commissioned purpose and may plan, use tools, prepare, and execute explicitly permitted actions within its own machine rights. An **avatar** is an advisory professional perspective without execution or approval rights. A **sentinel** is a check gate with an auditable result, not an acting user. The **human/organization** sets goal, rights, limits and bears responsibility. *Testable:* "Every agent action names agent, commission, acting role and responsible person; avatar outputs are labeled advice, sentinel outputs check findings; neither appears as a human approver."
- `[STANDARD]` **Support all roles agentically — one role profile, separated personal instances:** per supported role exactly one versioned role agent profile exists as the professional source of truth; each person gets a separate agent instance per actually held role and organization; shared role services may monitor/route role-wide tasks but never mix personal contexts or approve in someone's name. *Testable:* "Every action carries `agent_profile`, `profile_version`, `acting_for_person`, `role`, `organisation`, commission, `rights_snapshot`, `audit_id`; personal data/drafts/approvals are isolated between instances."
- `[HARD]` **Human role rights never automatically become agent rights:** agent rights are set separately per verb (read, propose, create, modify, delete, approve, lock, send, publish, payments/contracts, delegate, escalate) as `ALLOWED | ONLY_WITH_CONSENT | FORBIDDEN`. Externally effective, irreversible, person-, law-, safety- or finance-relevant actions require the defined approval gate; change after approval resets it. *Testable:* "No agent action without an explicit machine right and valid rights snapshot."
- `[STANDARD]` **Autonomy is per action, never blanket:** A0 observe · A1 advise · A2 prepare · A3 reversible internal routine · A4 externally effective after approval · A5 narrowly bounded delegated-autonomous. The level applies only to the named action, scope, data area, organization, period, and risk limit.
- `[HARD]` **No task without a responsible recipient and closure path:** every task/report/deadline/exception always has a responsible, suitable, entitled, reachable human actor or an explicitly permitted agent instance, response/completion deadlines, an escalation route, and a confirmable closure. `open + nobody responsible` is not a permissible state. *Testable:* "`responsible_actor != null`; open task has `next_escalation_at`; end state only confirmed-done, entitled/justified aborted, or auditable merged/discarded."
- `[HARD]` **Structural immediate escalation without waiting:** if the target role does not exist, is unstaffed/undesignated, without an active deputy, professionally unsuitable, insufficiently entitled, in the wrong business area, or unreachable for the priority, it is skipped **immediately** (routing time, no acceptance deadline). Waiting is only permitted for an actually existing, suitable, entitled, deliverable recipient. *Testable:* "`wait=0` for structurally unresolvable stages."
- `[STANDARD]` **Horizontal before/parallel to vertical; the top as guaranteed catch-all:** routing tries permissible deputies, other staffed role holders, and suitable neighbor roles; then escalates vertically; high priority may/must escalate in parallel. If all intermediate roles are missing, responsibility resolves directly up to CEO/management/Master of the Universe — in a one-person company everything lands on the founder; with growth, tasks distribute seamlessly to further roles.
- `[HARD]` **Business-area, tenant, and competence boundaries survive escalation:** horizontal escalation only to roles predefined as suitable and entitled; reachability alone creates no responsibility.
- `[STANDARD]` **Escalation rules are hierarchically configurable:** individuals may set stricter/earlier escalation within their rights; entitled roles configure processes below their scope; superiors set binding maximum deadlines, alarm levels, and emergency routes. Agents may detect gaps and propose rules but never create rights or weaken higher-ranking rules. Rank: law/safety > organization-wide hard > superior role rule > business area > role > personal setting > agent proposal.
- `[STANDARD]` **The time model separates routing, acceptance, first action, progress, resolution, confirmation:** tasks carry at least `created_at, routed_at, ack_due_at, acknowledged_at, first_action_due_at, first_action_at, progress_due_at, resolution_due_at, resolved_at, confirmed_at, next_escalation_at`. "Seen" or merely "acknowledged" does not stop escalation on critical tasks.
- `[STANDARD]` **Industry-, case- and working-time-based timing instead of one universal deadline:** deadlines are versioned per law/safety, alarm class, case type, industry, organization, business area, role, and permissible personal tightening; each deadline names its clock type (calendar/operating/working/on-call/legal/event time). Missing special value → industry default → visibly provisional system default plus a configuration task to the top role. *Testable:* "Every task references `timing_profile_id/version` and `clock_type`; a silent universal deadline is inadmissible."
- `[STANDARD]` **Priority steers order, time, escalation breadth and communication pressure:** effective priority weighs urgency, damage, deadline proximity, legal/safety relevance, idle time, blocked follow-ups, failed contacts, escalation level. P3/P4 mostly sequential; P2 shortened; P1 partly parallel; P0 immediately parallel/redundant.
- `[HARD]` **Alerting proportional but controlled:** critical cases activate in-app/push/e-mail/SMS/phone/on-call per policy and possibly several recipients; normal tasks respect quiet hours, P0/P1 use defined emergency paths. Deduplication, master case, cool-down, frequency limits and confirmed termination prevent alarm fatigue without suppressing the main alarm.
- `[STANDARD]` **Learned routines are autonomized only under control:** agents may propose a routine from sufficiently comparable, consistently decided, damage-limited cases. Autonomy arises only after approval with context, action, value/risk limit, validity, exceptions, mandatory sentinels and revocation. Automatic tightening may be approved; deadline extension, P0/P1 downgrading, or rights widening never silently.
- `[HARD]` **Every case is a fully closed control loop:** a task stays active and traceable until its result is confirmed by the intended recipient, effectively rejected/aborted, auditable merged, or justifiedly discarded by an entitled instance. "Processed", "forwarded", "seen", "no answer" are not end states. *Testable:* "No case disappears without `closure_status`, `closure_reason`, `closed_by`, `closed_at` and the required result receipt; every open loop has a next timer and recipient."
- `[STANDARD]` **Processing route and information route are separate and parallel (`ASSIGNED_TO` ≠ `REPORT_TO`):** `ASSIGNED_TO` bears operative responsibility; `REPORT_TO` receives role-, risk- and priority-appropriate overview, status, exceptions and alarms without automatically becoming the processor. Multiple `REPORT_TO` recipients are permissible for matrix/alarm cases.
- `[STANDARD]` **Management overview from one task source:** `REPORT_TO` roles get dashboards and fully filterable lists from the same task inventory; aggregates are computed from individual cases; drill-down to record/audit within rights. "Dashboard figure == filtered individual cases; no manually divergent parallel report."
- `[STANDARD]` **Predictive leadership: detect bottlenecks before tasks fail:** the `REPORT_TO` level receives rolling capacity/risk forecasts from confirmed task load, deadlines, dependencies, staffing, deputies, qualification/entitlement coverage, leave/working time/on-call, and permissibly used historical absence aggregates; the system forecasts capacity gaps, single points of failure, deadline and escalation risks and generates timely action proposals. *(A typical I1/ML system — see §10.12.)*
- `[HARD]` **No health profiling or disadvantage from illness data:** forecasts use aggregated/anonymized capacity values; personal diagnoses, presumed illness probability, performance/loyalty judgments, or automatic adverse HR decisions are forbidden. Individual absence may be used only in the required entitled scope as availability, never as diagnosis/character judgment; minimum group sizes and rights prevent re-identification.
- `[STANDARD]` **Predictive situation classification L0–L4:** L0 stable · L1 watch · L2 strained · L3 critical · L4 mission-critical; thresholds are industry/process-specific, versioned, never invented. Every forecast carries exactly one class, threshold profile/version, reasoning, confidence, and reaction policy.

*(from the Humpl / humpl.org menu & demo-showcase chat — v0.25. Author decision: "this is a golden rule for how we handle it in future" — applies to marketing of ALL [mn]universe modules.)*
- `[STANDARD]` **Live proof instead of claim:** Every module landing page embeds the current released facade demo (model C, §9.2) **runnable and without login** directly in the page — the visitor experiences the tool instead of having to believe screenshots. Screenshots/videos complement the live proof, never replace it. *Testable:* "Every published module landing page contains at least one embedded, interactive, login-free demo instance; a page without a runnable demo is a deviation."
- `[STANDARD]` **Responsiveness is demonstrated, not claimed (adaptive dual preview):** On a wide viewport, **two live instances of the same single file** run side by side — left in a mobile frame, right in desktop view; both clickable. On a narrow viewport, **one** instance runs (the device-matching one) and a visible badge explains that the same demo runs fully responsively on every screen — the visitor already holds the proof in hand. *Testable:* "Wide viewport: two simultaneously running instances of the same demo file visible; narrow viewport: exactly one instance + visible responsiveness notice; in no state is responsiveness merely claimed without at least one live instance."
- `[STANDARD]` **Quick demo access without login:** Every published demo has a **stable, speakable direct URL** (e.g. `…/demo/<module>`) opening the raw single file without site chrome, login, or mandatory cookies — for workshops, projector presentations, screen sharing, spontaneous demonstration. Every call starts with a fresh, labeled fake seed; no state persists between visitors. *Testable:* "The direct URL is reachable without login/consent coercion; two consecutive calls start with an identical initial state."
- `[STANDARD]` **One demo source, many appearances:** Landing pages, dual preview, fullscreen URL, and download always reference the **current released version from the central demo inventory** (demo hub); a new release updates all appearances automatically. No second hand-maintained demo copy per page exists. *(Instance of "one source" + "self-generated artifacts from configuration".)*
- `[STANDARD]` **Gated download as a trade with freedom of choice:** The downloadable single-file demo is unlocked via exactly one of two equally offered paths — **path A "conversation"** (contact data + appointment wish → scheduled marketing/consulting call) or **path B "concern"** (e-mail + problem description in the prospect's own words → download link by mail, which also verifies the address/double opt-in; the problem description is qualification gold). Both paths create a **lead as a closed control loop** (task with role, deadline, escalation — never a dead end). The delivered file carries version stamp + lead ID (§9.4). *(→ Field scope of the two paths exceeds the lead data-minimization minimum (Vera, §9.3) — reported as a conflict, see German master duplicates + ToDo v0.25.)*

*(from the AI-switch governance chat — v0.26. Details: §10.)*
- `[HARD]` **AI is an accelerator, never a load-bearing wall:** The whole system remains fully functional with AI completely switched off — all processes, approvals, escalations, reporting paths, and document generation continue via human roles and deterministic mechanics. Switching off degrades speed and comfort, never control, legal validity, data integrity, or the closed control loop. *Testable:* "**AI disconnection test** (analogous to the internet disconnection test): with global AI-off, all defined core processes pass acceptance; no process breaks, no task ends in the void."
- `[HARD]` **The gate stays, the checker changes:** AI-off never switches off a check gate (sentinel), an approval duty, or a rights boundary. Deterministic sentinels are not AI and always stay active; AI-assisted sentinels fall back to their defined deterministic substitute check or human attestation (`verification_mode=human`); humanly attested gates are untouched. *Testable:* "Every AI-assisted sentinel has a registered fallback; in AI-off state no mandatory gate is skipped — each is executed with a changed checker."
- `[HARD]` **The AI switch is a rights object with an emergency stop at the top:** the global AI on/off switch belongs exclusively to the top instance (CEO/management/Master of the Universe); global-off is an **emergency stop** — immediate, no query, no grace period. Area, role, and action switches are delegable down the hierarchy, but only **more restrictive** or within the limit released from above. *Testable:* "A switching attempt outside one's scope or beyond the limit set from above is not executable; global-off takes effect system-wide within one evaluation cycle."
- `[STANDARD]` **Effective AI state = most restrictive level of the chain:** the effective state of an action = **minimum** of Global → organization/tenant → business area → role → action; a lower level may tighten, never open what is closed above. The switch is not merely binary: it sets the **maximum autonomy level** per scope along the delegation ladder (off → comments → proposes/human approves → decides and informs ≙ A0–A5). *Testable:* "`effective_ai_level(action) == min(chain)`; no executed AI step exceeds the effective level."
- `[STANDARD]` **AI-off takes effect immediately and hands over in order:** on switch-off, running agent cases stop at once and are routed as a **handover task with a brief situation** (state, steps so far, next due step, deadline) to the responsible human role — no case ends in the void. *Testable:* "Every agent case open at switch-off afterwards has exactly one handover task with human recipient, brief, and deadline."
- `[STANDARD]` **Switching off deletes nothing (hide-not-delete):** AI-off deactivates; it deletes no agent profiles, learning states, configurations, or history — everything stays auditable but ineffective until lawfully re-enabled.
- `[STANDARD]` **Re-enabling is an approval act and restarts conservatively (safety net):** after re-enabling, every affected action first works **one level more conservatively** (back to propose → human approval) until the control regime (routine spot checks) re-establishes trust. Learned autonomous routines (A3–A5) require re-approval after longer off periods or context change (threshold `[OPEN]`).
- `[STANDARD]` **Every switching act carries reason and audit:** no AI switch without mandatory fields who/when/scope/function class/state/**reason** (categorized + free text) and optionally valid-until (time-boxed switch with follow-up). Every act creates a signed audit entry.
- `[STANDARD]` **Visible AI status (transparency toward those affected):** the effective AI state per scope is visible to affected roles ("AI: off / comments / proposes / decides — reason, since, by role"); nobody works unknowingly with or without AI participation.

*(from the AI provider abstraction chat — v0.27. Details: §10.8–§10.11.)*
- `[HARD]` **AI behind an adapter, never in domain code:** domain logic never calls a concrete AI vendor directly; every AI access goes through a **versioned internal AI contract** (capability classes with defined I/O schemas), behind which vendors sit as interchangeable **adapters**. *(SCLAN portability figure: domain core ⟷ transport adapters.)* *Testable:* "A machine scan finds no direct vendor call (SDK/endpoint) in domain logic; swapping an adapter — including the null provider (P0) — requires no domain-logic change; domain logic is testable with a mock adapter without any real vendor."
- `[HARD]` **Providers only from the approval register (allowlist, default deny):** an AI vendor is usable only when listed as approved in the **provider register** for the given legal space and tenant — hosting location/data residency, DPA (Art. 28 GDPR), certifications/regulatory role, no-training-on-tenant-data commitment, supported capability classes. Not registered or not approved = not callable. Approval/blocking only by the entitled role (top instance / dedicated legal admin), never sales/operators. *Testable:* "Every executed AI call references a register entry with status 'approved' for tenant + legal space + capability class."
- `[HARD]` **Data-class gate before every external AI call:** every payload is classified before dispatch (public · internal · personal · special categories · crown jewels); per provider and legal space it is defined which classes may reach it. **Crown jewels and forbidden classes never leave the organization** (P3/local or not at all); personal content passes a redaction/pseudonymization gate where prescribed; **no training on tenant data without explicit, documented tenant approval.** *Testable:* "Every external AI call carries a payload classification; a class impermissible for the target provider blocks the call; a crown-jewel marker in an outgoing payload = fail."
- `[STANDARD]` **Provider profile per tenant (P0–P3), resolved per scope × capability class:** **P0** no AI (≙ §10 off state) · **P1** shared platform provider from the register (default; per-tenant keys) · **P2** the customer's own cloud provider ("bring your own AI") · **P3** the customer's own/local AI behind the same adapter (data never leaves the organization). Resolution is deterministic with a defined **fallback chain** that may only become **more restrictive** (P3 → P0, never P3 → P1 — that would be data exfiltration through the back door).
- `[STANDARD]` **A provider change is an audited act with regression evidence and conservative restart:** change by the entitled role, passing the **golden-fixture regression** per affected capability class, then conservative restart (§ safety net). No silent behavior change.
- `[STANDARD]` **AI provenance record per call:** every AI call logs provider, model/version, adapter version, capability class, scope, payload data class, response status, and cost unit — auditable and evaluable per tenant (compliance and cost evidence).

*(from the intelligence-tiers chat — v0.28. Author decree, verbatim binding: see §10 motto. Details: §10.12–§10.13.)*
- `[HARD]` **Intelligence-tier ladder I0–I3 (the label follows the capability, not marketing):** every intelligent system function carries exactly one tier — **I0** deterministic rule/code · **I1** machine learning (per the I1 criteria catalog) · **I2** generative AI/language models (provider abstraction) · **I3** agentic AI. A component with generative capability may never be declared I1 to bypass switches, registers, or data-class gates. *Testable:* "A capability scan finding generative/external AI capability in an I0/I1-declared component = fail."
- `[HARD]` **I1 criteria catalog (what "machine learning" may mean here):** a component is I1 only if **all** criteria hold: (1) trained exclusively on the organization's/platform's own data with purpose binding; (2) runs fully in the platform or at the tenant — **no external data flow, no vendor**; (3) versioned model artifact: same model + same input = same output (reproducible); (4) **explainable** — the factors used are named and disclosed; (5) outputs are **scores/proposals/forecasts, never autonomous actions** — effect arises only via the delegation ladder; (6) no free-text generation, no external world knowledge, no agent planning. A failed criterion automatically upgrades the component to I2/I3 with all duties there.
- `[HARD]` **The accelerator principle holds per tier (I0 disconnection test):** "never a load-bearing wall" applies to every tier above I0: the system stays fully functional in pure **I0 operation** (ML and AI off). I1 forecasts/scores are comfort, never a precondition.
- `[STANDARD]` **ML closes control loops (target expansion stage — refined by author correction v0.29: "I0 first, rule before model"):** I1 is the preferred expansion stage to make already deterministically closed control loops capable of learning — forecasting, prioritization/routing proposals, anomaly/duplicate detection, classification proposals — always as a proposal inside the existing gates, always with disclosed factors, always switchable per scope. Where I1 suffices, no I2/I3 is used (**smallest sufficient tier**; an I2 use for an I1-solvable task requires justification).
- `[STANDARD]` **Tier switches inside the existing matrix:** the switch matrix gains the axis **maximum I-tier per scope × function class** ("organization: max I1 — ML yes, AI no" is a valid, testable state); resolution = minimum of the chain; I1 can stay on while I2/I3 are off — that is exactly what the tier is for; I1 itself is also switchable (e.g. codetermination on employee-data models).
- `[STANDARD]` **Tier classification replaces no legal review (Lex):** the I-tiers are **architecture and steering terms, not legal terms**. Regulatory AI definitions (e.g. EU AI Act) can also cover I1 systems; GDPR duties apply regardless of technique. The drastically smaller compliance attack surface of I1 (no vendor, no data outflow, explainable) is an architectural advantage — the legal classification per legal space/use case is made by a real lawyer/DPO and attested. "I1 = automatically compliant" appears in no document as a statement.

*(from the author correction "rule before model" — v0.29.)*
- `[HARD]` **I0 closes every control loop first (rule before model):** every control loop is closed from day 1 by deterministic code and human roles — routing tables, thresholds, timers, approval gates. An I1 model is always the **expansion stage of a working I0 loop**, never its first closure; no loop waits for a model. *Testable:* "Every defined control loop possesses a complete, model-independent I0 closure (rule set + responsible role + deadline + escalation); a loop whose functioning presupposes an I1 model is a deviation."
- `[STANDARD]` **Data-maturity gate before I1 live operation:** an I1 model may complement or replace an I0 proposal only after proven data maturity: sufficient evaluation/training data (minimums per use pattern `[OPEN]`), a passed **shadow mode** over a defined period (model runs in parallel without effect, measured against actual human/I0 outcomes), and quality at least at the I0 baseline — attested approval in the model governance object.
- `[STANDARD]` **I0 remains guardrail and fallback:** after activating an I1 model the I0 rule is not removed — it remains as a plausibility corridor (an I1 value outside it is flagged and falls back to the I0 proposal) and as the instant fallback on model shutdown, drift, or tier switch; switching the model off lets the loop continue without a gap.
- `[STANDARD]` **I0 operation produces the training data:** human decisions taken in the deterministically closed loop are captured — purpose-bound and within the data-protection limits — as future evaluation/training data. "Deterministic first" is not a detour; it is the data-collection phase of the maturity path.

*(from the control-loop lifecycle chat — v0.30. Details: §11.)*
- `[HARD]` **Trust is handed over consciously — for ML as for AI:** no I1/I2/I3 function acts beyond proposal mode without an explicit, attested **grant of trust** by the responsible role for exactly that scope. Data maturity is the necessary technical condition — the grant of trust is the second, independent human condition; trust is granted, never presumed, and revocable at any time (revocation = fall back to proposal mode).
- `[STANDARD]` **AI/ML handover protocol on role reassignment:** every role reassignment automatically generates (self-generated artifact from configuration) a **handover protocol** for the incoming person: which intelligent functions run in the role's scope (I-tier, models, autonomy/delegation levels, trust grants), how they work (factors, corridors, control-loop attachment), **which parameters the role may adjust/regulate** (rights-exact) — and **do-NOT notes** on what better not to change so as not to open control loops and leave them unobserved. Takeover is receipted (attestation); **until the receipt, autonomous functions in the role scope run one level more conservatively** (proposal mode).
- `[HARD]` **Control loops are explained (comprehensibility duty):** for every control loop it is documented and explainable to the involved roles: **what opens it, how it runs** (stations, roles, deadlines, escalation), **how it closes — and what happens if it is opened and left open.** No invisible loop, no unexplained automatism.
- `[HARD]` **Golden rule "status change of control loops":** every control-loop instance — carried by humans, deterministic code, ML, or AI — is controllable **at any time** by the responsible role: pause, abort, delete/archive, or **declare closed by decision** (even if factually unresolved). Every status change stops that loop's automatisms immediately, **informs all participants**, carries reason + audit, and preserves information and learning value (hide-not-delete; deletion only per legal situation). Automatisms thus always remain governable — they never run wild and never escalate senselessly; lower roles too can stop and change status within their scope. **Paused without a follow-up date is forbidden:** every paused loop carries a follow-up date or a conscious, attested open-ended decision.
- `[HARD]` **Every control loop has a caretaker role:** every control loop, however small — in SCLAN, Humpl, every product and organization — has exactly one responsible role that **nurtures, tends and administers** it. The system **prompts that role with what matters — in the right place** (in the working context, not a distant report). Orphaned loops do not exist; an unstaffed caretaker role escalates immediately.
- `[STANDARD]` **Control-loop management layer (escalation dampened, information preserved):** the status changes of all loops feed a well-kept management view for superior roles (`REPORT_TO`): visibly showing **whether things run smoothly or need support** — a true management tool with instant alerting that is itself a control loop. Escalation is dampened, but information is never lost, learning value is retained, centrally important information is passed upward automatically. It answers, for every loop: **"Are my processes running? How successfully, where not, where well?"**

*(from the governance-layers chats — v0.31–v0.33. Details: §12–§19.)*
- `[HARD]` **No ownerless datum (§12):** every data object type carries data class, exactly one staffed **data-steward role**, and a lifecycle status (collected → active/confirmed → archived → deleted). 
- `[HARD]` **Deletion is a control loop, not a hope (§12):** retention/deletion rules per data class with legal basis (via Lex); expiry auto-creates a deletion/archiving task; **data-subject rights** (access, rectification, erasure, portability) are standard control loops with statutory deadlines as timers.
- `[STANDARD]` **Data freshness instead of silent aging (§12):** master data carries a confirmation date; over the freshness threshold it is visibly marked "possibly outdated" plus a check task.
- `[STANDARD]` **Purpose binding at the object (§12):** the collection purpose is recorded on the data object; use outside the purpose is blocked or approval-mandatory.
- `[HARD]` **One dependency register for everything external (§13):** hosting, payment, DATEV, certificates, libraries, AI vendors — **one** register (the AI provider register is its special-case view), default deny, each entry with caretaker role, criticality tier K0–K3, and review date; a machine inventory scan finds no unregistered use.
- `[HARD]` **Supplier disconnection test per critical dependency (§13):** every K2/K3 dependency has a documented, exercised degradation path for "what if X fails" — the third instance of the disconnection-test figure; K3 additionally an exit/switch path (adapter principle).
- `[STANDARD]` **Expiries are timers, not surprises (§13):** contract ends, certificate and key expiries auto-create lead-time tasks for the caretaker role.
- `[HARD]` **The rehearsed emergency (§14):** disconnection tests are recurring, real **exercises** (AI off, internet off, supplier simulated dead) with measured results; every exercise produces finding tasks; an overdue exercise escalates.
- `[HARD]` **Incident lifecycle with learning duty (§14):** reported → contained → resolved → **learned** (role, deadline, escalation per stage); **no incident closes without a learning entry** flowing back into sentinels, degradation paths, exercises, or I1 early warning — "the emergency is the most expensive source of training data; wasting it is forbidden."
- `[STANDARD]` **The emergency plan works without the system (§14):** emergency roles, deputies, reachability and first measures exist as a current **offline artifact** — the plan for "system down" never lives only inside the system.
- `[HARD]` **Identity lifecycle joiner–mover–leaver (§15):** rights exist only bound to an active identity with a valid role assignment; all rights end automatically on the leaving date; accounts are deactivated, never deleted (audit remains).
- `[HARD]` **Orphaning lock (§15):** an identity cannot be deactivated while it still owns caretaker roles (§11), data stewardships (§12), dependency responsibilities (§13), or open control loops — offboarding generates the handover tasks automatically; no offboarding creates orphaned loops.
- `[HARD]` **Recertification — rights lapse if nobody confirms them (§15):** periodic confirmation per rights criticality; overdue → conservative restriction → withdrawal + escalation. *(Fifth instance of "nothing ages unobserved".)*
- `[STANDARD]` **Rights diff instead of accumulation (§15):** every role change is an explicit diff (what comes, what goes), old rights end atomically; temporary rights always carry an expiry.
- `[STANDARD]` **Staged onboarding (§15):** rights take effect in stages against receipts (briefing, protocol acknowledgment, training); full effect only after the onboarding loop completes.
- `[STANDARD]` **Break-glass as an audited control loop (§15):** predefined, time-boxed emergency access; every use fully audited, instantly reported to leadership, auto-opening an incident review; exercised like every degradation.
- `[HARD]` **Budget switch with staged degradation (§16):** every cost-incurring automatism is bound to a budget per scope and degrades in stages on exhaustion — normal → throttled → proposal-only → off — instead of running on unbounded or dying hard; costs come from the existing provenance records/individual events (no second bookkeeping).
- `[STANDARD]` **Budget overrun is a control loop (§16):** exhaustion creates a decision task (raise · keep throttled · switch off) with deadline; burn-rate signal in the management view.
- `[HARD]` **The protected reporting channel is a sealed-off control loop (§17):** reports (also anonymous, with case-code return channel) open a loop with a dedicated, sealed-off **confidentiality role** as caretaker; statutory deadlines (acknowledgment, feedback — concrete values per legal space via Lex, nothing invented) run as timers with escalation **inside the seal**.
- `[HARD]` **Sealing is architectural, not organizational (§17):** report data is its own data class with access only for the confidentiality role; **no** link between report and person visible to leadership or `REPORT_TO`; the management view receives exclusively k-anonymous aggregates (benchmark anonymization pattern incl. anti-differencing test).
- `[HARD]` **Knowledge ages visibly (§18):** every knowledge artifact (guide, process/loop description, template, training material — and this master itself) carries caretaker role, as-of date, and review interval; overdue = visible "possibly outdated" mark + check task. *(Sixth instance of "nothing ages unobserved".)*
- `[STANDARD]` **Reference instead of copy, generation instead of hand-maintenance (§18):** knowledge is generated from configuration where possible and otherwise maintained exactly once and referenced; recognized gaps (from incidents, handovers, onboarding) are tasks; knowledge appears **at the place of work**.
- `[HARD]` **Every outside voice opens a control loop (§19):** complaint, support ticket, feedback, review, cancellation reason — each becomes a loop instance with caretaker role, deadline, lifecycle status; nothing silts up.
- `[STANDARD]` **Every complaint is a training datum, and the loop closes bidirectionally (§19):** closure only with a categorized learning entry; the sender learns what became of their voice (or the justified decision not to act).

*(from the bilingualism chat — v0.34.)*
- `[STANDARD]` **Bilingualism rule for the master (DE = lead version, EN = derived artifact):** The universemaster is maintained exclusively in the **German lead version** — it is the one source. This English edition is a **generated, derived translation artifact**: its header carries (a) the **precedence note** ("the German version prevails"), (b) the **source version stamp** (which German version it was generated from), (c) the **binding terminology map** DE→EN, and (d) the **explicit declaration that it is the translation of the German master document, which is the master for this edition**; not-yet-translated parts are declared stubs referencing the master. The EN edition is **regenerated on every new German version, never edited independently**; a content change always begins in the German master. *Testable:* "The EN edition carries precedence note, source version stamp == current German version (otherwise visibly marked stale), terminology map, and derivation declaration; every untranslated section is a declared stub; an EN edit without a corresponding German change is a deviation."

*(from the developer-role & migration chat — v0.35. Author clarification: the developer role is responsible for the application control loops; the server crew is responsible only for operating the server, not for functions of the Humpl app and others.)*
- `[STANDARD]` **Function vs. operations responsibility (developer ≠ server crew):** The **developer role** is the caretaker role (§11) of the **application control loops and functions** per product, and of functional dependencies (domain interfaces, §13). The **server crew** is responsible exclusively for **operations** — server, infrastructure, stack, pipeline operation, infrastructure dependencies — and **never** for application functions. *Testable:* "No application control loop references the server crew as caretaker role; every application control loop references a developer/domain caretaker role; infrastructure objects reference the server crew."
- `[STANDARD]` **Rule coverage as a living project status (CPM/Kanban-capable):** The rule-coverage evidence (§2 v0.19) is not only per-deliverable proof but is kept as a **continuous status in the project documentation**: per product exactly **one living coverage board** where every applicable rule/implementation package is a card — status (open · in progress · done · n/a with justification), responsible developer role, deadline, and **dependency links** (critical-path view). This gives concrete overview during development of what is open and done, so planning, implementation and completion can be tracked CPM/Kanban-style. Figures are aggregates of the card statuses, never hand-maintained beside them. *Testable:* "Per product exactly one coverage board exists; every applicable rule has exactly one card with status, owner, deadline; dashboard figure == card count; an applicable rule without a card is a deviation."
- `[STANDARD]` **Master receipt of the developer role (onboarding stage):** Every person in the developer role receipts acknowledgment of the master rules applicable to their work (the EN edition is permissible; German prevails, §2 v0.34) as a mandatory onboarding stage (§15.2); without the receipt, no write/approval-rights stage. A new major master version creates a re-receipt task.
- `[STANDARD]` **Own tools first (dogfooding duty):** For to-do/Kanban planning, the **own, already existing tools** are tested, understood and used first — before procuring or building others. Use is at the same time the **real lab**: recognized gaps and friction flow back as learning/outside-voice entries (§14.4/§19). Which tools exist: `[OPEN]` — inventory, invent nothing.
- `[STANDARD]` **Migration old→new as a guided path (real lab instead of hard cut):** Existing tools and applications are lifted step by step to this master's state: **(1) current use as real lab** — the own tool is used productively and checked against the master (gap list = cards on the coverage board); **(2) migration cards** with priority and dependencies plan the takeover; **(3) adoption into the updated version as soon as well possible**, with first tests in real operation; **(4) the old state remains fully runnable until the confirmed takeover** — no hard cut, way back documented ("prove before acting"). *Testable:* "Every legacy tool in migration has gap list + migration cards; the new version leads only after a confirmed real-lab test; until then the old state runs and the way back is documented."

*(from the pair-generation chat — v0.36. Author instruction: "from now on always generate the DE and EN editions together and always check for consistency.")*
- `[STANDARD]` **Pair generation DE+EN with a consistency gate:** Every new German master version generates the English edition **in the same release step** (pair generation — no German release without the co-generated English edition). Before the **pair release**, two checks run: **(a) machine** — the EN-derivation sentinel (§6 of the German master): precedence note, source version stamp == German version, terminology map, derivation declaration, declared stubs, **structure parity** per translated area (equal section/rule/status counts, §2 v0.8); **(b) content** — the avatar **Lingua** (§7) for materially changed sections — fidelity of meaning and terminology, attested as "checked by ‹person› on ‹date›" on the EN artifact (the software attests only the presence of the human check; Lingua is advice, never approver, never a gate). **Alarm on a finding (closed control loop):** a fail blocks the pair release; the German edition stays workable, the English edition is visibly marked **"stale / not released"** (no silent stale state); the finding creates **exactly one P2 task with deadline and brief findings** for the master's caretaker role; if unattended, the standard escalation chain applies (deputy → leadership → the top as guarantor); the event appears as a health signal in the management view (§11.4/§18). *Testable:* "For every German version a co-generated English edition exists with a green derivation sentinel and Lingua attestation of the changed sections; if either is missing, the English edition is visibly marked stale/not released and exactly one finding task with deadline is open."

*(from the currency-anchor chat — v0.37. Author template from an older project: a QR code printed on paper/PDF documents executing a check link on our server — "check this document's currency by scanning".)*
- `[STANDARD]` **Currency anchor on exported documents (paper freshness):** Documents leaving the system (print, PDF, dispatch) carry, per template policy, a **currency anchor**: a QR code at the start and/or end with the visible caption ("Check this document's currency by scanning"), encoding **document ID + state/version ID** and pointing to a **public check endpoint**. The endpoint answers exclusively with status — "current" or "newer version available (version, as-of date)" — **never with content** (showcase ≠ blueprint); reachable without login/mandatory cookies. **Honest degradation:** if the endpoint is unreachable, the answer is "check currently not possible — note the as-of date on the document" — never a false "current". *Testable:* "Every anchor resolves to document ID + version; the endpoint response contains only status/version/date, no document content; the unreachable case yields the degradation answer instead of a currency verdict."
- `[STANDARD]` **Template policy per document type (mandatory · optional · free), role-dependent:** Template management defines per document type: **MANDATORY** — the generation gate refuses output without the anchor (display ≠ gate); **OPTIONAL** — entitled roles may **consciously omit** the anchor (documented decision with role + reason); **FREE** — roles may add the anchor themselves. Legally/tax-/deadline-relevant document types are MANDATORY candidates. *Testable:* "Every document type carries exactly one anchor policy; a MANDATORY document without anchor cannot be generated; every conscious omission references role + reason."
- `[STANDARD]` **Scan telemetry data-minimal (anonymous by default):** A scan event records by default only **document ID, checked version, timestamp, check result** — **no person reference**; the IP serves security only. Person-bound usage signals only in an authenticated context with purpose binding (§12); anything beyond: legal review (Lex), assume nothing. The anonymous usage signals are legitimate operating knowledge: they feed the knowledge management view ("most-used artifacts"), and **frequently checked documents get shorter review intervals** (freshness prioritization; an I1 candidate on the maturity path — phase 0 starts as a simple counting rule). *Testable:* "A default scan event contains no personal field; person-bound capture references authentication + purpose; interval prioritization derives traceably from the counts."

*(The printed document is a derived artifact — the QR anchor is its derivation sentinel, the same figure as this English edition's relation to the German master. Seventh instance of "nothing ages unobserved". Details: German master §18.4.)*

*(from the interplay chat — v0.38. New chapter §20. Motto (v0.39): **The human is the sovereign — the role is accountable, the agent acts, the twin personalizes, the avatar advises, the sentinel blocks.**)*
- `[STANDARD]` **No gate without care, no perspective without a bearer (§20.5):** every sentinel references a staffed caretaker role (application sentinels → developer role, infrastructure sentinels → server crew); every avatar references its current bearer mode (AI-assisted / played by a human) and the person attesting its checks. *Testable:* "No sentinel without a caretaker-role reference; no avatar attestation without person + date; an orphaned gate escalates like an orphaned control loop."
- `[STANDARD]` **One person, many hats, clear hat changes (§20.5):** a person may hold several roles and play several avatars — but for every action it is visible **in which capacity** they act (role, played avatar, attestation); self-approval of one's own work in the same matter follows the existing four-eyes/attestation rules. *Testable:* "Every approval/attestation names person + capacity; an action without a capacity statement is a deviation."

*(from the v0.40 four-thread package: avatar perspective profile · teacher–student distillation · decision economics · communication check rails. Details: German master §20.8, §10.14, §16.4/16.5, §5 build form.)*
- `[STANDARD]` **Avatar intelligence lives in the versioned perspective profile, not the model (§20.8):** per avatar exactly one versioned profile (embodied rules · check questions/checklist · applicability triggers · represented sentinels · known failure patterns · bearer mode + attesting person · learning inflow · version + approval). **When an avatar must be concerned is decided by the I0 applicability trigger (set by humans) or a failed gate it represents — never by the model, never ad hoc.** The bearer (I2 or human) only speaks the profile; with AI off, the human checklist *is* the profile — the perspective loses nothing but speed. New check questions arise only as a new profile version with approval.
- `[STANDARD]` **Distillation is a training-time relationship, not a runtime tier (§10.14) — AI teaches, ML works:** I2 may accelerate I1 data maturity (pre-labeling legacy data as **proposals**, human-confirmed via the spot-check regime; label provenance `label_provenance[]`/`teacher_ref` mandatory; unconfirmed teacher labels only within a quota and marked); the data-maturity gate and shadow mode remain untouched; at runtime of a completed capability **only I1 runs** — completion target: **zero runtime tokens per capability**; retraining on drift is a bounded budget event. The data-class gate also applies to teaching (sensitive data: local P3 teacher or human).
- `[CONVENTION]` **Cost maxim (§16.4):** *Tokens arise only where free speech happens.* I0/I1 (gates, routing, templates, classification, forecasting, style/spell watch) = token-free; I2/I3 = budgeted token rent; distillation turns rent into a one-off investment.
- `[HARD]` **"The decision" is never sold as a legal act (§16.5):** monetized are decision *preparation* (I1/I2 units, always proposals) and delegated *routine execution* within humanly approved limits (customer trust grant) — the binding act stays human. Which decision types may be offered as delegated units at all is decided per type by an attested legal review (HR = high risk: GDPR Art. 22, EU AI Act employment category; the v0.24 HR protection rule is not for sale).
- `[STANDARD]` **Billing = aggregate of provenance records, per configuration:** sold units (proposal/score I1 as plan/headroom quota · comment/review I2 metered per call, capped by customer config · delegated routine decision I3 per execution) are billed exclusively from existing provenance records — every invoice line auditable down to the single call; the customer's switch matrix is their price configurator ("you pay for what you delegate"); budget degradation is the built-in customer cap; the **distillation dividend** (I2→I1 drives marginal cost to zero) is shared.
- `[STANDARD]` **Communication check rails (§5 build form):** every outgoing business communication runs through its template's **check profile** — per dimension (spelling/grammar · company writing style · legal · technical/professional · security/data classes · mandatory disclosures) exactly one of **MANDATORY** (gate, blocks dispatch) / **COMMENT** (advice, never blocks) / **OFF**; "everything OFF = free unaudited drafting" is a documented role permission, not a default; "grammar + spelling only" is a valid configured state. I2 checks run exclusively via **fixed, versioned, approved prompts** stored in the template system (never ad-hoc prompts in the check path; a fixed prompt = a configured capability class with golden fixtures). Spelling, grammar and the **company's own writing style run as I1** — an owned style/spelling database as a maintained knowledge artifact (caretaker role, freshness), token-free, distillable. Draft provenance (human/AI/mixed) is recorded. **Contradictions** between check voices, or between a check voice and the drafting role, open a **conflict case to the next higher instance** (chain of command) — unless the role holds the documented free-drafting permission; comments never block, only MANDATORY gates do; every conflict outcome becomes training data.

*(from the Universe-Mail chat — v0.41. Author commission: the universe offers its own mail software, online and offline, observing all universe rules. Details: German master §21. Core sentence: **e-mail is a channel of the control-loop system, not a second filing place.**)*
- `[HARD]` **Mail is a channel, not a filing place:** business-relevant cases live as control-loop instances (caretaker role, deadline, status) — **never only in a mailbox**. Inbound mail is case-bound via the two anchors (`[REF]` subject + sub-addressing); unbound business mail enters an assignment queue (a loop with a deadline). A case existing only in a mailbox is a deviation.
- `[STANDARD]` **Universe-Mail is a full universe application — all rules apply:** outgoing mail runs through the communication check rail (v0.40) incl. recipient-language rule, draft provenance, and the **mandatory signature** (business disclosures per legal space, via Lex) as a MANDATORY dimension; inbound status is **never adopted unverified** (HMAC action links or verified sender); AI/ML in mail (I1 triage proposals · I2 reply drafts via fixed prompts) obeys the switch matrix, the **data-class gate** (mail content never reaches external AI unfiltered — crown jewels: P3 or not at all) and budgets; encryption at rest/in transit with tenant keys.
- `[STANDARD]` **Offline mail with an honest outbox:** reading, searching, composing work fully offline; I0/I1 check dimensions run locally (style DB at the tenant); the **outbox is visible** with a status per mail (waiting · sent · receipted · failed→task) — no silently lost mail; a MANDATORY I2 dimension offline degrades to human attestation or the dispatch waits (documented per profile); the internet disconnection test applies to Universe-Mail as to SCLAN.
- `[STANDARD]` **Mail retention is a §12 control loop:** business mail = data object with class, steward, retention/deletion rule (legal-space duties via Lex, nothing invented); deletion/archiving runs as a loop, never as a mailbox cleanup spree.

*(from the ledger/tables/app-register chat — v0.42.)*
- `[STANDARD]` **Table/list build form (every data table in the universe):** every list/table view offers at minimum: column choice + order per user · per-column sorting · per-column filters + full-text search · **saved, named filter views** (personal; shareable per role within rights) · an aggregate counter row (figure == filtered rows) · **export as a clipboard round trip** (export with schema line, v0.12 — every export is re-importable) · large-set handling without silent truncation · rights-exact row actions · a speaking empty state. *Testable:* "Every table view fulfils the capability catalog; counter == row count of the active filter; an export re-imports losslessly; silent truncation is a deviation."
- `[HARD]` **Ledger integrity — correction by counter-entry, never by overwrite:** booked ledger entries are **immutable**; errors are corrected by a **reversal/counter-entry referencing the original**, never by editing or deleting. Balances are exclusively **aggregates of individual entries** (never hand-maintained parallel figures); every entry carries the audit record and its confirmed state. Professional bookkeeping/retention duties per legal space via Lex — nothing invented. *Testable:* "A mutation or deletion attempt on a booked entry is not executable; every correction references its original; balance == sum of entries at any time."
- `[STANDARD]` **One product/app register — the rule in the master, the list in the tool:** exactly **one** living product register of all started applications, maintained **in our own tooling** (Humpl/universe project world, dogfooding v0.35), **not in the master document** (the document holds the rule, never the aging inventory — §18). Per app: status (idea · started · real lab · master-compliant up to vX · productive · paused with follow-up date · archived) · caretaker/developer role · referenced **master version last checked against** · link to its **coverage board** (v0.35) · old→new migration phase. It permanently answers: *which apps did we start, which must we finish, which are up to standard?* The ledger is the first migration candidate.

*(from the ledger extraction — v0.43. Author commission: extract all table/list rules from `ledger-and-lines-v12_4_2_.html` and codify them as configurable functions, switchable on/off per role. Full switch-key catalog: German master §5.)*
- `[STANDARD]` **Every table capability is a named switch per scope × role:** the capability catalog (groups: structure — insert/duplicate/delete/move rows & columns, split/merge cells, sheets/folders · data — per-column sort & filter, full-text search, multi/range selection, **live selection statistics** · calculation — formula picker, recalculation (v0.9 protection applies) · formatting — text formats, row/column colors, bands, skins, language · **import** — clipboard schema, file, **image/PDF/screenshot with confidence** · export — CSV/XLSX/PDF/HTML, at least one active path round-trip-capable · history — undo, fresh-change highlighting · collaboration — collab level, identity/team, activity feed with filters, notifications, visible sync status · help) ships as a default profile per template and is configured per organization → area → role (on/off, hide-not-delete). **OFF is enforced at the action endpoint, not merely hidden** (visibility is not security).
- `[HARD]` **Capability switches only narrow — they never open:** no role/template configuration can extend beyond the rights matrix or defeat integrity rules: **ledger integrity (counter-entry), audit duty, MANDATORY gates and data-class gates are unswitchable**; no switch ever permits editing/deleting booked entries.
- `[STANDARD]` **Confidence import is a proposal:** image/PDF/screenshot extraction shows its **confidence** and creates proposal rows adopted by a human (proposal ≠ decision); the method carries its intelligence tier honestly (deterministic parsing I0 · own model I1 · generative extraction I2 → then provider, data-class and budget governance — a screenshot with personal data reaches external AI only through the gate).
- `[STANDARD]` **Honest work & sync status:** save/sync/queue states are visible (saved · waiting · synced · failed→task); selection/live statistics are aggregates of the individual cells; fresh foreign changes are highlighted in collaboration.

*(from the search/filter mindsets chat — v0.44, for Ledger & Lines and every table view.)*
- `[STANDARD]` **The filter bar always sits above the table and governs everything below it:** filter/search controls render **above** the rows (never hidden in menus, never below); the **active filter state is always visible** (which conditions apply, "12,944 of 1,304,328"); everything below obeys the displayed state without exception — no row outside the filter, no silent extra condition.
- `[STANDARD]` **Boolean filter logic in full:** filters are expressible per column **and** in combination — AND / OR / NOT with parenthesis groups — combinable with full-text search; every boolean combination is saveable as a named view.
- `[STANDARD]` **Search-in-results as a visible stage chain (`search.in_results`):** every refinement searches **exclusively within the current subset** (never a silent re-query of the full inventory) and appears as a stage in a visible chain with counters ("1,304,328 → 12,944 → 231"); each stage removable individually; changing the **base search** resets the chain with a warning. **Mindset hint (mandatory on the first refinement per session):** *"Tip: first check whether an improved base search is what you mean — search-in-results only finds what is already inside the subset."* **Standard short example (help text):** base search "status = open" → 12,944 of 1,304,328 rows; search-in-results "invoice 2023" finds only *open* 2023 invoices — the invoice 2023 that was *closed yesterday* exists in the database but not in your subset: the refinement **inherits every restriction and every blind spot of the first search**; an improved base search "invoice 2023" over the full inventory would have found it. Maxim: *search-in-results can only narrow — it can never discover what the first search excluded.*

---

## 20 · The Interplay — Human, Roles, Agents, Twins, Avatars, Sentinels (Synergies & Coexistence)    [GLOBAL Core] *(translated)*

**20.1 The human and the five actor kinds:** **Human** (the sovereign — the sole source of accountability, trust, approval, and value/boundary decisions; fills roles, bears avatars, grants and revokes trust, may stop any control loop at any time; may never be replaced, disenfranchised, or turned into a pass-through) precedes all actor kinds; the role is the human's garment. Then: **Role** (human accountability bearer — decides, approves, grants trust, sets limits; never hands accountability to machines) · **Agent** (actor on commission — plans, prepares, executes within delegation level and machine rights; never approves, never poses as a human, never operates any switch, never creates rights) · **Digital role twin** (the personal agent instance per person × role × organization — carries exactly one person's context in exactly one role; never mixes contexts, never approves in someone's name) · **Avatar** (advisory perspective, embodied voice — advises, reviews *from a viewpoint*, can be a review checklist; never approves, never is a gate, never executes) · **Sentinel** (machine check gate — true/false checks, blocks, creates finding tasks; never advises, weighs, decides, or acts as a user). Every actor has exactly **one** of these natures — the label follows the capability; category discipline.
**Avatar ⟷ sentinel is n:m:** an avatar can represent **none, one, or several** sentinels — one perspective, many enforceable consequences (*Tekton* represents six hardware gates; *Chronos* the currency sentinel and the currency anchor). And one sentinel can embody several perspectives (the AI data-flow/residency sentinel enforces Vera's data minimization *and* Lex's legal-space admissibility — two voices, one gate). First mapping table: German master §20.7 (proposal, author confirmation pending).

**20.2 The normal pass through a control loop:** human in the role sets goal/rights/delegation/trust → the person's twin takes the case into *their* context → the agent prepares (collects, I1-classifies, drafts) exactly up to the effective level of the switch matrix → avatars appear in review (each voice one perspective, each advice, none a gate; with AI off the same voices become human review checklists — the perspective stays, only its bearer changes) → sentinels block the gates (true/false, no discretion; a fail creates a finding task, never a silent pass) → the human decides and approves (proposal ≠ decision; attested where software cannot verify correctness itself) → the learning loop closes: the human decision becomes purpose-bound training data; `REPORT_TO` sees the aggregate.

**20.3 Coexistence boundaries:** *An avatar never becomes a sentinel* — three activities are permitted to an avatar regarding "its" gates, none of which is operating them: **(a) godparent of new gates** (an enforceable avatar concern becomes a new sentinel with a testable rule; the avatar stays the voice, the gate does the blocking), **(b) interpreter of findings** (when one of its gates fails, the perspective explains *why* it matters), **(c) checklist bearer with AI off** (all its gates degrading to human attestation appear on its review checklist). An avatar never operates, opens, overrides, or blocks a gate. — *An agent never becomes a role* (machine rights only by explicit per-verb grant; `acting_for_person` is a commission, not an identity). — *A twin never becomes a collector* (one person, one role, one organization per instance). — *A sentinel never becomes an advisor* (a "recommending" gate is mislabeled). — *The human never becomes a pass-through* (a role that only nods is an alarm signal of the control regime — approval is examination, not gesture).

**20.4 Synergies:** degradation (if one kind fails, the next carries — the gate stays, the checker changes; no actor whose failure paralyzes the system) · scaling (one versioned role profile feeds any number of twins without contexts touching) · evidence (avatar advice + human attestation + sentinel log = the audit chain: who was warned, who checked, what was enforced) · learning (sentinel findings, avatar notes, and human corrections are three separate training-data sources of the maturity path).

**20.5 Human staffing:** role — always humanly staffed or guaranteed via deputies/escalation up to the top · agent/twin — never "staffed", but always with a human accountable (`acting_for_person`) and a role frame · avatar — *borne*: AI-assisted (I2) **or** played by a human as a review checklist; the attestation of its checks is human in both cases · sentinel — never staffed, but **cared for**: every gate has a caretaker role (application → developer, infrastructure → server crew). Plus the two §2 v0.38 rules above.

**20.6 Miniature:** a receipt arrives → the accountant's **twin** takes it into her context → the **agent** classifies via I1 (proposal, factors disclosed) → the **accountant** confirms (proposal ≠ decision) → the **mandatory-disclosure sentinel** checks the gate; a finding would create a task → on legal uncertainty **Lex** speaks in review ("confirm with a real tax advisor") and the check is **attested** → `REPORT_TO` sees only the aggregate → the decision becomes purpose-bound training data. Five natures, one control loop, no boundary violation.

---

## 3 · Roles    [PROJECT]  — **[NOT YET TRANSLATED]**
*Scope: named roles of the universe (author/technical review = Bernhard Hnida; Master of the Universe = top instance; privilege tiers T1–T7; avatars in §7; staffing and deputy rules). Sharpened in v0.35: the **technical role / developer** is the caretaker role of the **application control loops and functions per product** (Humpl etc., §11), owns functional dependencies (e.g. DATEV, §13) and the living coverage board, and receipts the applicable master rules as an onboarding stage (§15.2) — with no access to personal business data; the **server crew** covers **operations only** (server, infrastructure, pipeline), explicitly **no responsibility for application functions**.* **See German master §3, which prevails.**

## 4 · Rights & Rights Matrix    [GLOBAL/PROJECT]  — **[NOT YET TRANSLATED]**
*Scope: the rights matrix (WHAT each role may do), supplementary rules incl. key rotation, compliance-register write rights, chain-of-command seam (Weisungs-Naht), §4.1 agent machine rights and autonomy A0–A5, and the AI-switch supplementary rule (v0.26: global switch only at the top; area/role switches delegable only more restrictively; every role may tighten for itself; agents never operate any switch — not even their own).* **See German master §4.**

## 5 · Standards & Build Forms (Bauformen)    [GLOBAL]  — **[NOT YET TRANSLATED]**
*Scope: tech-stack profiles (WEB/SERVER, EMBEDDED/FIRMWARE, GATEWAY, PROTOTYPE/DELIVERABLE — a prototype is never automatically the production server), single-file HTML prototypes, offline-first + internet disconnection test, SCLAN portability architecture (domain core ⟷ adapters, testable with test adapters), versioned bridge contracts (schema/fixtures/compatibility test), self-generated artifacts from configuration, module switches (hide-not-delete), KMS/per-tenant keys, i18n lead-language structure, mandatory-disclosure register build form, communication without developer jargon, do-NOT list, **adaptive demo-showcase build form (v0.25:** claim · dual-preview layout ~1200 px breakpoint `[OPEN]` · mobile frame ~390 px · responsive badge · fullscreen button on the direct URL · QR bridge onto the viewer's device · gated-download CTA directly beneath the showcase · every instance with demo header band + fresh fake seed**)**.* **See German master §5.**

## 6 · Sentinels (Check Gates)    [GLOBAL]  — **[NOT YET TRANSLATED as a table]**
*Scope: the full sentinel catalog (~50 gates): contrast, schema/migration drift, deliverable gate, demo header band, demo showcase (v0.25), AI disconnection test [HARD], AI-switch effectiveness [HARD], gate degradation [HARD], AI restart, provider adapter [HARD], provider approval [HARD], AI data flow/residency [HARD], provider change, tier label [HARD], I1 model governance [HARD], I0 disconnection test [HARD], control-loop maturity [HARD], control-loop status [HARD], caretaker role [HARD], handover protocol, management layer, data steward [HARD], deletion loop [HARD], data freshness, dependency register [HARD], supplier disconnection test [HARD], expiry follow-up, exercise [HARD], incident learning [HARD], emergency plan, identity lifecycle [HARD], orphaning lock [HARD], recertification [HARD], break-glass, budget switch [HARD], reporting-channel sealing [HARD], knowledge freshness [HARD], outside voices [HARD], and more. Each row defines: what it checks · when it runs · pass criterion · rule reference · status.* **See German master §6 — the testable clauses of the §2/§10–§19 rules above mirror the gate conditions.**

## 7 · Avatars (Advisory Perspectives)    [GLOBAL/PROJECT]  — **[NOT YET TRANSLATED]**
*Scope: embodied review perspectives (e.g. Lex/legal, Vera/data minimization, Aria/accessibility, Lingua/translation). Advisory only — never approvers, never sentinels (§1 rule 9). With AI off, each avatar becomes a human review checklist (§10.1).* **See German master §7.**

## 8 · Reference / Project Details    [PROJECT]  — **[NOT YET TRANSLATED]**
*Per-chat provenance blocks recording what was adopted generically vs. kept project-specific, incl. the documented interpretation (v0.25): "integrating mockups into the real applications" = the funnel (demo → lead → trial tenant model A → flag flip), never code adoption of the single file into production.* **See German master §8.**

## 9 · IP Protection Rules    [GLOBAL]  — **[NOT YET TRANSLATED]**
*Scope: staged disclosure (showcase ≠ blueprint), delivery models **A** hosted trial tenant (default — no code leaves the server) · **B** activated appliance · **C** facade demo (simulated logic, never production code); facade preparation incl. demo header band + fake seed + license + **version stamp** + lead ID (machine-readable); lead data minimization (Vera); landing-page build form (benefit promise, screenshots, videos, **embedded adaptive demo showcase as mandatory element 3a (v0.25)**, primary CTA trial, secondary CTA gated download via paths A/B, price, support).* **See German master §9.**

---

## 10 · AI-Switch Governance    [GLOBAL Core]

> **Guiding principle `[HARD]` (author decree, verbatim binding): "AI is an accelerator, never a load-bearing wall."**
> Extended by the tier clarification (v0.28): **"Machine learning is intelligent code — not intelligent agents, and not artificial intelligence."**

*(New in v0.26, extended v0.27/v0.28. The "who may cut the power — and does the house still stand" section. Proof = the AI/I0 disconnection test. Generalizes the Humpl delegation ladder "AI off → comments → proposes/human approves → decides and informs" system-wide.)*

### 10.1 · Function classes — what the switch switches (and what never)

| Function class | "AI off" means | always stays active (not an AI object) |
|---|---|---|
| **Agents** (§4.1) | no agent instance runs; running cases stop and are handed to the responsible human role with a brief | the tasks themselves, their deadlines, timers, escalation chains, the closed control loop (deterministic mechanics) |
| **Avatars** (§7) | no AI-generated review voices; every avatar perspective exists as a **human review checklist** worked by the review role | the review duty as such |
| **Sentinels** (§6) — threefold | **AI-assisted** sentinels fall back to their registered fallback: deterministic substitute check or human attestation (`verification_mode=human`) | **deterministic** sentinels (contrast, schema, migration, quotas …) — measuring devices, not AI; **humanly attested** gates — untouched. **The gate stays, the checker changes.** |
| **AI proposals/generation** (translation drafts, text drafts, rankings, triage reasoning, AI-generated summaries) | proposal fields stay empty / show "AI off — manual entry"; human input / rule templates take over | artifacts **generated deterministically from configuration** (§5) — template mechanics, not AI |
| **Learning** (learning loop, learned routines) | own switch; AI-off also stops learning **and** its data collection; existing learning states remain but are neither used nor extended | the audit history of human decisions (record, not a learning run) |

### 10.2 · Switch matrix — scope × state
**Scopes (chain, inherited like rights):** Global → organization/tenant → business area/site → role → single action/process step.
**States per scope × function class (the delegation ladder as the scale, ≙ A0–A5):** `off` · `comments` · `proposes` (AI prepares, a human approves every effect) · `decides and informs` (only within explicitly delegated routine limits).
**Resolution:** effective state = **minimum of the chain** — lower levels may tighten, never open. **Safety net:** on deviating preconditions every action automatically falls back to `proposes`.

### 10.3 · Switching rights
| Level | who switches | character |
|---|---|---|
| **Global (emergency stop/on)** | top instance only (CEO/management/Master of the Universe) | emergency stop: immediate, no query, no grace; re-on is a conscious approval act |
| **Organization/tenant · business area** | delegable to leadership roles within their scope | only more restrictive or within the limit set from above |
| **Role** | the role's leadership; additionally **every role may tighten for itself** (personal opt-out) | self-opt-out never wider than the frame |
| **Action/process step** | process owner within scope | finest granularity; typical for piloting |
| **Agents** | **never** — no agent operates any switch, not even its own | technical prohibition, not an appeal |

### 10.4 · Configuration object (per switch, versioned)
`scope` · `function_class(es)` · `state` · `reason_category` (law/compliance · codetermination/works council · data protection · quality/trust · cost · pilot · incident — catalog `[OPEN]`) · `reason_freetext` · `valid_from/until` (time-boxed switch with automatic follow-up task) · `switched_by/at` · `review_at` · `audit_id`. A switch without a reason is not executable.

### 10.5 · Behavior on switch-off (orderly transition)
1. **Immediate effect** in the affected scope (one evaluation cycle). 2. **Running agent cases:** stop → exactly one **handover task** each, to the responsible human role, with brief (state · steps/attempts so far · next due step · deadline) — routed, deputized, escalated like any task; no case ends in the void. 3. **Hide-not-delete:** profiles, configuration, learning states, history fully retained and auditable — merely ineffective. 4. **Visibility:** affected roles see "AI: off — reason, since, by role". 5. **Gates degrade, never fall:** AI-assisted mandatory sentinels switch to their fallback; every gate keeps executing.

### 10.6 · Behavior on switch-on (conservative restart)
1. Switching on is an **approval act** of the entitled role — never automatic, never by mere time expiry (expiry of a time-box creates a follow-up **task**, no auto-flip). 2. **Safety net active:** the first N actions per scope run one level more conservatively (`proposes` instead of `decides`) until the **control regime** (routine spot checks every N decisions; stricter for uncertain decisions) re-establishes trust. 3. **Learned routines (A3–A5):** re-approval after off-duration above threshold or context change (`[OPEN]`). 4. **Learning loop:** human decisions from the AI-off phase become available to learning only after the learning switch is re-enabled — humans may accept/ignore/modify.

### 10.7 · Full operation without AI — the proof (AI disconnection test)
| Function | carried without AI by |
|---|---|
| Task routing & escalation | routing table (one source), staffing/deputies, timed deadline timers, P0–P4 mechanics — fully deterministic |
| Approvals & rights | rights matrix (§4), approval gates, attestation fields — never were AI |
| Documents/artifacts | templates + set values (§5 self-generated artifacts); AI text proposals lapse |
| Reviews | avatar perspectives as human checklists; the review role works and attests them |
| Check gates | deterministic sentinels unchanged; AI-assisted ones via fallback |
| Case closure | closed control loop, receipts, `REPORT_TO` dashboards from individual tasks — deterministic aggregation |
| Translation/i18n | lead language + approved locale files; new translations manual |
| Predictive view | lapses entirely or runs purely rule-based — declared a comfort loss, never a control loss |

**Reading for the owner:** the AI disconnection test is the same figure of thought as the internet disconnection test — what the cloud is to SCLAN, AI is to the organization: a valuable addition with defined degradation, never a single point of failure.

### 10.8 · AI provider abstraction (adapter architecture, v0.27)
| Layer | content | analogous to |
|---|---|---|
| **Domain logic** | calls only capability classes of the internal contract ("translate", "propose reply", "classify receipt", "extract fields", "plan agent step") | SCLAN domain core |
| **AI contract** | per capability class: I/O schema, context limits, quality/latency expectation, fallback behavior, golden fixtures — versioned, machine-readable | versioned bridge contracts |
| **Provider adapter** | maps the contract to exactly one vendor/model (cloud API, customer contract, or local model); holds all vendor specifics | OS/transport adapters |
| **Null/test adapter** | P0 adapter ("AI off", deterministic) and mock adapter for tests without a real vendor | test adapters without real transport hardware |

**Capability classes instead of vendor features:** domain logic knows classes, never vendors. A provider declares in the register which classes it fulfils; a missing class triggers the per-class degradation (another approved provider in the fallback chain, or P0 behavior "field empty, human takes over"). Capability-class catalog `[OPEN]`.

### 10.9 · Provider register & approval (v0.27)
Register entry per vendor (build form of the mandatory-disclosure register): `provider_id` · `name` · `operating_form` (cloud-shared / cloud-dedicated / on-prem) · `hosting_locations/data_residency` · `legal_space_approvals[]` (approved / blocked / under review, with legal basis) · `dpa_ref` (Art. 28 GDPR) · `certifications/regulatory_role` · `training_on_tenant_data` (no / only with documented tenant approval) · `capability_classes[]` (+ fixture status) · `permitted_data_classes[]` · `cost_model` · `status` · `approved_by/at` (attestation) · `review_at`.
**Rules:** allowlist, default deny; approval/blocking only top instance / dedicated legal admin; blocking takes effect immediately for all tenants of the legal space; running calls fall back controlled onto the fallback chain or P0 — never silently onto another external vendor. *(Since v0.31 this register is the special-case view of the general dependency register, §13.)*

### 10.10 · Tenant sourcing models P0–P3 ("bring your own AI", v0.27)
| Model | description | data/contract situation | typical occasion |
|---|---|---|---|
| **P0 — no AI** | §10 off state; full operation via humans + deterministic mechanics (10.7) | no AI data flows | prohibition by law/regulator/works agreement |
| **P1 — platform provider** *(default)* | vendor from our register, operated by us; per-tenant keys, tenant separation | our DPA covers the tenant; only permitted data classes | standard SaaS customer |
| **P2 — customer's own cloud provider** | tenant brings its own vendor contract/keys; same adapter, different credentials | contract + responsibility with the tenant; register approval still mandatory | group frame contract, parent-company mandate |
| **P3 — customer's own/local AI** | self-hosted model behind the same adapter | data never leaves the organization; the only option for crown-jewel/forbidden classes | data-residency law, high-security/government |

**Resolution:** effective provider = f(tenant profile × scope × capability class × data class × legal space), deterministic, with a fallback chain that may become **more restrictive** (P3→P0), never more permeable (P3→P1 would be data exfiltration). **Partial permission** is the same matrix as §10.2 plus the provider axis: "translation proposals via P2 permitted, agent autonomy forbidden, receipt classification only P3" is a valid, testable state.

### 10.11 · Provider change & operation (v0.27)
1. Change = approval act of the entitled role with reason + audit. 2. **Regression evidence:** golden-fixture run per affected capability class against the new adapter — passed before the change takes effect. 3. **Conservative restart** (§10.6) after every change. 4. **Provenance record per call** — basis for compliance evidence toward the tenant's regulator and for per-tenant cost steering. 5. **Vendor outage is a routing case, not an exception:** fallback chain, otherwise P0 degradation with visible status ("AI vendor unavailable — manual processing"), never a silent vendor switch.

**Reading for the owner:** the vendor is a driver, not a load-bearing structure. Whether no AI (P0), ours (P1), yours (P2), or one in your own basement (P3) — the application, its processes, gates and rights are identical; only the adapter behind changes.

### 10.12 · Intelligence tiers I0–I3 (v0.28)
| Tier | name | what it is | compliance attack surface | switching/governance |
|---|---|---|---|---|
| **I0** | deterministic rule/code | routing tables, templates, arithmetic, approval gates, timers — the load-bearing structure | minimal (classic software) | always on; the fallback of all higher tiers |
| **I1** | machine learning | statistical models per the **I1 criteria catalog** (own data only · runs in platform/at tenant · no external data flow · versioned/reproducible · explainable, disclosed factors · scores/proposals/forecasts only) | drastically smaller: no vendor, no residency question, explainable — **but:** tier classification replaces no legal review (Lex) | switchable per scope; default **on**; model governance object mandatory |
| **I2** | generative AI / language models | text/content generation, extraction with world knowledge, LLM translation proposals — the provider world | provider register, data-class gate, residency, P0–P3 | full AI-switch governance (§10.1–§10.11) |
| **I3** | agentic AI | agents (§4.1): plan, use tools, act multi-step within autonomy | largest surface: autonomy, rights, escalation | additionally delegation ladder/A-levels, agent sentinels |

**Ladder rules:** 1. **The label follows the capability** — upgrading on a failed criterion is automatic; downgrading never without evidence. 2. **Smallest sufficient tier.** 3. **Every tier falls controlled onto the one below:** I3→I2→I1→I0; the I0 structure always carries (I0 disconnection test). 4. **Matrix integration:** §10.2 gains the **maximum I-tier** per scope × function class in addition to state (delegation ladder) and — for I2/I3 — provider (P0–P3).

**Model governance object per I1 model (versioned):** `model_id` · `purpose/scope` · `training_data_snapshot` (origin, purpose binding, period) · `factors[]` (disclosed) · `metrics` · `model_version` + reproducibility evidence · `golden_fixtures` · `approved_by/at` (attestation) · `legal_classification_ref` (Lex, per legal space) · `review_at`. Retraining = new version = approval act with fixture run.

### 10.13 · ML use patterns — making control loops capable of learning (v0.28, refined v0.29)
**Author correction v0.29 ("rule before model"):** Not ML closes control loops — **I0 closes every control loop first**; deterministic code and human roles carry the loop from day 1, precisely while evaluation and training data are still insufficient. I1 is the expansion stage, reached via the **control-loop maturity path**:

| Phase | carrier | what happens |
|---|---|---|
| **0 — rule operation** | I0 + human | loop runs fully deterministically; human decisions are captured purpose-bound as future training data |
| **1 — shadow mode** | I0 acts · I1 measures | model runs in parallel without effect; its proposals are measured against actual human/I0 outcomes (period + metrics per pattern `[OPEN]`) |
| **2 — live with guardrail** | I1 proposes · I0 bounds | after the data-maturity gate + attested approval, I1 becomes the proposal generator; the I0 rule remains as plausibility corridor and instant fallback |

Target expansion stages (phase 2) — each a proposal generator inside an existing gate, never a new decider; each begins life as an I0 rule: predictive view/capacity (L0–L4 proposals to `REPORT_TO`) · task routing & prioritization proposals · triage/arbitrage with learned instead of hand-set weights (factors stay disclosed) · anomaly & duplicate detection (check task, never auto-correction) · classification & structured extraction (proposal field, human takes over) · learned-routine detection (routine **proposal** into the approval object) · benchmarking band/percentile models on anonymized aggregates (k-anonymity remains the gate).
**Learning demarcation:** I1 model training (platform-internal, model governance) ≠ vendor model training (external, register field, default forbidden) ≠ routine learning approval (autonomy acquisition) — three levels, three gates, never mixed.

---

## 11 · Control-Loop Lifecycle & Management Layer    [GLOBAL Core]

*(New in v0.30. The layer above all control loops: governability, handover, care, visibility. Principle: automatisms serve — they never run wild; humans can steer every loop at any time without losing information or learning value. Also resolves the hidden tension of "no task ends in the void": the conscious status decision of the responsible role **is** a legitimate ending — documented instead of run dead.)*

### 11.1 · Lifecycle status of every control-loop instance
| Status | meaning | effect on automatisms | duties |
|---|---|---|---|
| **open/running** | loop works regularly | active per effective I-tier/delegation | caretaker role monitors; deadlines/escalation apply |
| **paused** | consciously halted (e.g. lead "will call after vacation") | **all automatisms stop immediately**; no reminders, no escalation | **follow-up date mandatory** or attested open-ended decision; participants informed |
| **aborted** | ended early (case moot) | stop; open subtasks get an abort receipt | reason + audit; participants informed; learning-value capture |
| **closed** | regularly completed | — | receipt mechanics as usual |
| **closed by decision** | declared ended by the responsible role although factually unresolved (e.g. a lead who never decides and never declines) | stop; loop counts as ended | reason + audit mandatory; participants informed; information/history remains (hide-not-delete) |
| **deleted/archived** | removed from the active inventory | — | only per legal situation (retention vs. deletion duties, Lex `[OPEN]`); audit of the deletion decision |

**Rules:** exactly one status per instance; status change only by entitled roles (the caretaker role always; deeper roles within their scope: **stopping always works**, re-opening only if entitled); every change = reason + audit + participant information within one cycle; permitted transitions per role `[OPEN]`.

### 11.2 · AI/ML handover protocol on role reassignment
Generated automatically from configuration, receipted by the incoming person: 1. **Inventory** — all intelligent functions in the role scope (I-tier, models, autonomy/delegation levels, valid trust grants, running loop instances with status). 2. **How they work** — disclosed factors, plausibility corridors, attached loops (reference to the loop description). 3. **Levers** — which parameters this role may adjust (rights-exact) and which only leadership sets. 4. **Do-NOT notes** — what better not to change so as not to open loops and leave them unobserved (typical traps per function, generated from the loop description). 5. **Receipt** — attestation of takeover; **until then everything autonomous in the scope runs one level more conservatively** (proposal mode).

### 11.3 · Caretaker role & explainability
Every loop references exactly **one staffed caretaker role** (staffing/deputy rules apply); orphaned loops escalate immediately. The **loop description** (opens/runs/closes/consequences-if-left-open) is a mandatory part of every loop definition and the source of handover-protocol sections 2 and 4. The system **prompts the caretaker role in the right place**: due follow-ups, unhealthy loops (long open, often escalated, never closed), missing receipts — in the working context.

### 11.4 · Management layer (the new view upward)
Fed exclusively from status events and health signals of the individual loops (aggregate from individual statuses — nothing maintained twice). **Health signals per loop type** (thresholds `[OPEN]`): throughput time, escalation rate, share "closed by decision", pause duration, follow-up fidelity — yielding the traffic light "running smoothly / needs support / alarm". **Alerting is itself a control loop:** a threshold breach creates a task for the responsible leadership role with deadline and escalation — dampened (aggregated), but lossless; the learning value (why paused/aborted/closed by decision) feeds the maturity path as training data. **The layer's answer:** "Are my processes running? How successfully, where not, where well?" — for every loop, from the marketing funnel through SCLAN maintenance to the smallest internal procedure.

### 11.5 · Pattern: lead exit (example of the status rule)
A lead who neither decides nor declines is eventually no longer courted: the caretaker role of the lead loop decides **pause** (with follow-up), **closed by decision**, or — per legal situation — **delete/archive**. Automatic nurturing steps stop immediately; the lead experiences no pointless perpetual messaging; history and learning value remain and feed the management view and future I1 models. Exit criteria per funnel project-specific `[OPEN]`.

---

## 12 · Data Governance    [GLOBAL Core]

*(New in v0.31. The object: the datum itself — not the process using it.)*

### 12.1 · Governance fields per data-object type
`data_class` (public · internal · personal · special categories · crown jewels) · `steward_role` (staffed, deputy regulated) · `purpose[]` (recorded at collection) · `status` (lifecycle 12.2) · `collected_at` · `confirmed_at` + `freshness_threshold` · `retain_until`/`deletion_rule` + `legal_basis_ref` (Lex) · `origin` (source/loop) · `usages[]` (which processes/models read it — basis for purpose checking and data-subject access).

### 12.2 · Data lifecycle
| Status | meaning | automation |
|---|---|---|
| **collected** | captured, possibly unconfirmed | freshness timer starts |
| **active/confirmed** | in use, freshness within limits | purpose-bound use free |
| **possibly outdated** | freshness threshold exceeded | visible marking + check task to the steward |
| **archived** | withdrawn from active use | read/evidence access only; retention timer runs |
| **deleted** | removed per legal situation | deletion evidence (audit) remains |

### 12.3 · Data-subject rights as standard control loops
Access · rectification · erasure · portability: every request opens a loop with the statutory deadline as timer, caretaker role = steward (+ data-protection role), escalation before expiry. The access report feeds from `usages[]` — no manual search. Concrete deadlines/duties per legal space: Lex, real review `[OPEN]`.

### 12.4 · Data management view
Freshness signal per inventory · open data-subject requests with remaining deadline · overdue deletions · orphaned objects (steward unstaffed) — aggregated into `REPORT_TO`, alarm as its own control loop.

---

## 13 · Dependency Governance    [GLOBAL Core]

*(New in v0.31. The object: everything external the operation depends on. The AI provider register (§10.9) is a special-case view of this register — one register, not two.)*

### 13.1 · Register field catalog
`dependency_id` · `kind` (hosting · payment · domain interface e.g. DATEV · certificate/key · library/service · AI provider → special fields §10.9) · `caretaker_role` · `criticality` (13.2) · `contract/dpa_ref` · `expiry_dates[]` (contract, certificate, key — each creates lead-time tasks) · `degradation_path_ref` (mandatory from K2) · `exit_path_ref` (mandatory from K3) · `status` (evaluated → approved → active → phasing out → ended) · `review_at` · `approved_by/at` (attestation).

### 13.2 · Criticality tiers
| Tier | meaning | duties |
|---|---|---|
| **K0** | dispensable/cosmetic | register entry |
| **K1** | disruptive on failure | + active caretaker role, review |
| **K2** | operation-critical | + documented, **exercised** degradation path (supplier disconnection test) |
| **K3** | existence-critical | + exit/switch path (data export, adapter principle §10.8) + exercise duty (§14) |

### 13.3 · Supplier disconnection test & degradation path
Per K2/K3: "X fails" → defined degradation (which functions continue, which pause with visible status, who is informed, which substitute path applies) — the same figure as internet and AI/I0 disconnection tests: **a valuable addition with defined degradation, never a single point of failure.** Evidence by real exercise (§14), not paper.

### 13.4 · Dependency management view
Expiry radar (next 90 days) · criticality map · exercise state per K2/K3 · phasing-out entries without a successor decision — aggregated, alarm loop.

---

## 14 · Emergency Governance — "The Rehearsed Emergency"    [GLOBAL Core]

*(New in v0.31. The difference between "we would have a plan" and "we can do it". The object: the exceptional state itself.)*

### 14.1 · Exercise control loop
Per critical degradation (AI off · internet off · K2/K3 supplier off · restart) an exercise calendar: real, announced or semi-announced drill → measurement (does the degradation carry? times? gaps?) → **finding tasks** to the caretaker roles → next date. An overdue exercise = escalation (follow-up principle). Frequencies per criticality `[OPEN]`.

### 14.2 · Incident lifecycle
| Status | role/deadline | duty |
|---|---|---|
| **reported** | any role may report; the emergency role takes over within the deadline | initial situation documented |
| **contained** | emergency role | effect limited; participants informed |
| **resolved** | domain/caretaker role | normal operation confirmed; conservative restart where applicable (§10.6) |
| **learned** | caretaker role + leadership | **learning entry mandatory:** cause, adjustment (rule/sentinel/model/exercise); no closure without it |

### 14.3 · Emergency roles & offline plan
Emergency roles and deputies named in advance; the **emergency plan** (roles, reachability, first measures, short-form degradation paths) exists as a current **offline artifact** — exported/printed, with as-of date and its own freshness loop. The plan for "system down" never lives only inside the system.

### 14.4 · Learning from the emergency
Learning entries flow back: new/tightened sentinels, adjusted degradation paths, exercise scenarios, training data for I1 early warning — the emergency is the most expensive, most valuable source of training data; wasting it is forbidden.

### 14.5 · Emergency management view
Exercise fidelity (planned vs. performed) · open finding tasks · incident metrics (times per status change, repeat causes, thresholds `[OPEN]`) · plan freshness — aggregated, alarm loop.

---

## 15 · Identity & Rights Governance (Joiner–Mover–Leaver)    [GLOBAL Core]

*(New in v0.32. The object: the identity and its rights over time. The rights matrix (§4) remains the source of WHAT a role may do — §15 governs WHEN a person effectively holds that role.)*

### 15.1 · Identity lifecycle
| Status | meaning | rights effect | duties |
|---|---|---|---|
| **joining** | joiner in onboarding | staged per receipt (15.2) | onboarding loop runs; sponsor role named |
| **active** | regular assignment | full per roles + recertification | confirmation dates current |
| **moving** | mover between roles | diff: old rights end, new begin; conservative until handover receipt (§11.2) | handover protocol + rights diff |
| **leaving** | leaver until the leaving date | expiring; sensitive rights possibly reduced early (`[OPEN]` per case) | offboarding checklist; orphaning lock (15.4) |
| **deactivated/archived** | after the leaving date | none; account cannot log in | audit/evidence remains; identity history deleted only per legal situation (§12) |

### 15.2 · Joiner — staged onboarding
Onboarding is a control loop (caretaker: the area's leadership role; a sponsor role supports): stages such as basic access → domain access → write/approval rights → full delegation breadth, **each stage against a receipt** (briefing, acknowledgment of the role's handover protocol, training evidence where applicable). Deadlines + escalation like every loop; a stuck onboarding becomes visible, not forgotten.

### 15.3 · Mover — diff & handover
Reference §11.2 (handover protocol) — extended by the rights side: the change generates the **rights diff** (comes/goes/stays-time-boxed), effective atomically at the change moment; caretaker roles/stewardships move explicitly (the orphaning lock applies here too). Deputies are temporary assignments with expiry, never permanent possession.

### 15.4 · Leaver — offboarding with orphaning lock
The offboarding checklist is generated from configuration and automatically lists: all caretaker roles (§11), data stewardships (§12), dependency responsibilities (§13), open loop instances, keys/devices/certificates (§13 register), knowledge handover (leaver variant of the handover protocol). **Deactivation is only possible once every position is receipted as handed over.** Rights end automatically on the leaving date — never "forgotten active".

### 15.5 · Recertification
Periodic confirmation of every rights assignment by the leadership role (interval per rights criticality `[OPEN]`; sensitive rights more often). Overdue → conservative restriction (e.g. read/proposal mode) + task → persistently overdue → withdrawal + escalation. Built as a one-click loop in the management view, not a bureaucracy battle.

### 15.6 · Break-glass (emergency access)
Predefined scenarios (catalog `[OPEN]`), time-boxed access, full audit, instant information of the leadership role, automatic incident review (§14.2). Break-glass is exercised like every degradation — an emergency access nobody can operate is none.

### 15.7 · Identity & rights management view
Rights map per area · overdue recertifications · stuck on-/offboardings · temporary rights near expiry · break-glass uses · accounts without activity (threshold `[OPEN]`) — aggregated, alarm loop.

---

## 16 · Budget/Cost Governance    [GLOBAL Core]

*(New in v0.33. The object: money as a running quantity of the automatisms. No second bookkeeping — costs come from the individual events that already exist.)*

### 16.1 · Budget object
`scope` (organization → area → role → automatism/capability class) · `period` · `amount/units` · `caretaker_role` · `thresholds[]` (e.g. 70/90/100 % — defaults `[OPEN]`) · `degradation_chain` (normal → throttled → proposal mode → off) · `status` · audit per change. Sources: AI provenance records, call/consumption events — aggregate from individual statuses.

### 16.2 · Staged degradation
Like the AI switch, economically triggered: threshold 1 → yellow light + information; threshold 2 → throttling (quotas, batch instead of instant); exhaustion → proposal mode or off with visible status ("budget exhausted — manual processing") and a decision task to the caretaker role. Never a silent continuation, never a hard death mid-case (running cases are handed over in order, §10.5 pattern).

### 16.3 · Cost management view
Burn-rate light per scope · period-end forecast (I1 candidate, maturity path) · biggest cost drivers · degradation events — in `REPORT_TO`, alarm loop.

---

## 17 · Reporting/Whistleblower Governance    [GLOBAL Core]

*(New in v0.33. The object: the protected voice. The special control loop — sealed off instead of aggregated upward. Also a Humpl module candidate; legal details per legal space via Lex — here only the mechanics.)*

### 17.1 · The sealed-off loop
Intake (named or anonymous; anonymous return channel via case code) → acknowledgment (deadline timer, value via Lex) → examination/measures by the **confidentiality role** → feedback (deadline timer, value via Lex) → closure with anonymized learning entry. Escalation on deadline risk stays **inside the seal** (deputy confidentiality role, never line leadership).

### 17.2 · Sealing architecture
Own data class "report" (§12) · access exclusively for the confidentiality role(s) · no person link outside · management view exclusively k-anonymous aggregates (count, categories, throughput times; automatic widening of too-small groups — benchmark pattern) · retention/deletion of cases per legal situation (§12.3, Lex).

### 17.3 · Confidentiality role
Staffing + deputy in advance (staffing rules), expressly **outside line command** for this object (documented chain-of-command-seam exception); its own onboarding stage (§15.2). Conflict of interest per case → deputy path.

---

## 18 · Knowledge Governance — "Knowledge Ages"    [GLOBAL Core]

*(New in v0.33. The object: the organization's documented knowledge. This master itself already lives this layer — changelog, review, time machine; here it is generalized.)*

### 18.1 · Knowledge-artifact register (lightweight)
`artifact_id` · `type` (guide · process/loop description · template · training · rule set) · `caretaker_role` · `as_of_date` · `review_interval` · `source` (generated from configuration ↔ hand-maintained) · `references[]` (where it appears — reference instead of copy) · `status` (current · possibly outdated · under revision · archived).

### 18.2 · Freshness & gaps
Overdue review → marking + check task. Recognized gaps — from incidents ("doc was missing"), handovers ("protocol section empty"), onboarding feedback — become tasks with role + deadline. **Findability at the place of work:** knowledge appears in the working context (linked at the loop, the form, the function — "software comes to the user"), not only in a distant repository.

### 18.3 · Knowledge management view
Freshness quota per area · open gap tasks · most-used vs. never-used artifacts (archive candidates) — aggregated, alarm loop.

---

## 19 · Outside-Voice Governance    [GLOBAL Core]

*(New in v0.33. The object: every voice from outside — complaint, ticket, feedback, review, cancellation reason. The outside counterpart to Humpl's inside satisfaction measurement.)*

### 19.1 · Intake & loop
Every voice → a loop instance (§11 status model) with category, caretaker role (per channel/topic), deadline. Triage per the existing pattern (I1 classification proposal as target expansion stage, maturity path). Duplicate/repeat detection links voices into a topic loop instead of isolated handling.

### 19.2 · Learning duty & feedback
Closure only with a categorized, anonymizable **learning entry**; collected insights flow into product to-dos, training (§18), and I1 early warning. **Feedback to the sender** belongs to the loop — what was changed, or why consciously not (justified waiver documented). The closed control loop thereby becomes bidirectional: the outsider too learns the ending.

### 19.3 · Outside-voice management view
Voice signal (volume, categories, repeat topics, time-to-answer, time-to-closure) · share "closed with feedback" · topic trends (thresholds `[OPEN]`) — the question "are my processes running?" answered from outside, equal beside the inside view (§11.4).

---

## Provenance / Duplicates & Conflicts / Changelog — **German-only (historical record)**
These sections document the origin chats, reported duplicates/conflicts (incl. the two pending author confirmations: v0.25 funnel interpretation, v0.28 compliance wording) and the full version history. **See German master.**

---

## ToDo (open items, v0.25–v0.33 excerpt — full list incl. earlier items in the German master)

**Open from v0.25 (demo showcase & lead paths):** field set path A/B vs. lead data minimization (Vera) — author decision · dual-preview breakpoint/frame spec · direct-URL/QR scheme · badge/CTA wordings per language · demo-hub technique (central inventory, auto-update of embeds, machine-readable version stamp + lead ID) · author confirmation of the funnel interpretation · humpl.org menu structure (project-specific).
**Open from v0.26 (AI switch):** delegation-ladder ⟷ A0–A5 binding mapping · reason-category catalog · restart parameters (N, re-approval thresholds) · fallback catalog per AI-assisted sentinel · AI disconnection-test scope per product · AI-status UI build form.
**Open from v0.27 (provider abstraction):** capability-class catalog · golden-fixture sets per class · data-classification schema (incl. crown-jewel list relation) · redaction/pseudonymization gate technique · register approval process per legal space (real lawyer) · P3 reference architecture · cost steering per provider/tenant.
**Open from v0.28 (intelligence tiers):** author confirmation of the compliance wording ("drastically smaller attack surface" + mandatory legal review, instead of "no compliance problems") · legal classification of I1 per legal space (Lex, EU AI Act) · capability-scan technique · I1 use-pattern prioritization per product · model-governance field polish · codetermination for I1 on employee data.
**Open from v0.29 (rule before model):** data-maturity thresholds per pattern · shadow-mode specification · plausibility corridors.
**Open from v0.30 (loop lifecycle):** final status catalog + permitted transitions per role · handover-protocol build form detail · health signals & alarm thresholds per loop type · deletion vs. archiving duties per loop type (Lex) · lead exit criteria (project-specific) · follow-up mechanics for paused loops.
**Open from v0.31 (data/dependency/emergency):** seven-building-block pattern as a meta rule? (author decision — would make the master generative; also usable as a Humpl audit tool) · data-object-type catalog + freshness thresholds · data-subject deadlines per legal space (Lex) · inventory-scan technique · criticality rating of the current inventory · exercise frequencies + first drill plan · emergency-plan build form.
**Open from v0.32 (identity):** recertification intervals per rights criticality · offboarding-checklist build form (incl. early reduction of sensitive rights, Lex) · break-glass scenario catalog · onboarding stage plans per role family · inactivity threshold.
**Open from v0.33 (budget/whistleblower/knowledge/outside voices):** budget threshold defaults + throttle procedures · whistleblower legal review (Lex; then deadline values as timer configuration) · confidentiality-role concept incl. technical sealing · knowledge-artifact inventory · outside-voice channel catalog + categories · Humpl module shaping of §17/§19 (project-specific; landing-page candidates with demo showcase per §2 v0.25).

*(End of the English edition — the translated, derived artifact of the German master `universemaster_v0_34.md`, which prevails. Regenerate from the German master on every new version — never edit this file independently.)*
