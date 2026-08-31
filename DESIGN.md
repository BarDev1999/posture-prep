# Design notes

The build spec asks for a token plan written first, critiqued against generic defaults,
and only then built. The skill it names lives at a path that does not exist on this
machine, so this is the same two pass process done longhand, recorded here so the
reasoning is visible rather than implied by the CSS.

Done at stage 4, with all the real content already on screen, which is the point of
leaving it until last.

## Pass one, the plan

**The reference.** Not a study app. The domain vernacular is findings, severity,
evidence and status, and that world has its own visual language: the ledger, the audit
trail, the severity scale. So the model is a printed compliance sheet crossed with a
terminal audit tool. Ruled lines rather than floating cards. A left gutter carrying
identifiers, the way a ledger carries line numbers. Monospace for anything that is data,
proportional type for anything that is prose. Square corners, because a ledger has them.

**Colour.**

| Token | Dark, "night ledger" | Light, "paper ledger" |
|---|---|---|
| ground | `#0a0d12` near black, blue leaning | `#eef1f5` cool paper |
| sheet | `#10151c` | `#ffffff` |
| rule | `#1e2733` hairline | `#d7dee7` |
| ink | `#e6edf5` | `#0c1219` |
| accent | `#35c294` | `#0d7a5f` |

One accent, and it means one thing: cleared. It fills progress bars and the primary
action, and nothing else. That is semantically right here, since green in a posture tool
means no finding, so a bar filling with it reads as work discharged rather than as
decoration.

The severity ramp is separate and is reserved for genuine severity: critical, high,
medium, low, plus the four drill ratings, which map onto the same scale so the two read
as one system. Severity is never the only carrier: every use is next to the word.

**Type.** One sans for interface, one mono for data. Both from the system stack, because
a web font is a download, an offline risk and a flash of unstyled text on a bus. The
mono face is the one the user reads SQL in, so it is set at 14px and never smaller. Six
sizes, no more: display for the one thing read at arm's length (the drill question),
large, base, small, meta, and code. Counts and identifiers get `tabular-nums` so numbers
do not jitter as they tick.

**Structure.** A 2.75rem left gutter on every content row, carrying the identifier
(`F12`, `Q3.4`, `res-01`) and any status tick. Rules instead of boxes: lists are ruled
rows on one sheet, and a full border is kept only where something is genuinely a
container. Radius 2px throughout. No shadow anywhere.

## Pass two, the critique

**"Dark navy, teal accent, hairline borders" is a generic developer tool theme.** True,
and the nearest failure mode. What pulls it away is the gutter, the ruled rows and the
tabular numerals: those read as a document, not as app chrome. The light theme carries
more of the weight here, because a genuine cool paper sheet is not what a dark first
developer tool usually bothers with.

**Identical rounded cards with a soft grey shadow.** Explicitly ruled out by the brief,
and the stage 1 to 3 build had drifted towards it: every panel was `border, background,
padding` at the same radius. Fixed by removing shadows entirely, dropping to 2px, and
converting most panels to ruled rows on a shared sheet.

**Warm cream, serif display, terracotta accent.** Ruled out by the brief. The light
theme is deliberately cool rather than cream, and there is no serif anywhere.

**Five section colours.** Considered and rejected. The exam sections are not severities
and colouring them would be five more hues carrying nothing. Section weight is the real
variable, so it is shown as a number and as bar length, not as a hue.

**Is the accent doing too much?** It was: primary action, progress, active tab, priority
tag and links all shared it. Now the active tab is marked by a rule and by ink weight,
priority is a bordered mono tag, and the accent is left to mean cleared.

## Constraints held throughout

- Touch targets 44px minimum, and the four rating buttons sit at the bottom of the drill
  where a thumb reaches them.
- Dark mode follows `prefers-color-scheme` unless overridden, and is resolved before
  first paint so a dark phone never flashes white.
- `prefers-reduced-motion` stops everything. The card reveal is the only animation in
  the app.
- Visible focus on every interactive element, on both themes.
- Sentence case, plain verbs, no filler. Buttons say what happens. Empty states say what
  to do next.
