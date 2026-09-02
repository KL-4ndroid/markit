# Market Notes Information Architecture

## Decision

The app keeps two separate note concepts because they have different ownership,
lifecycles, and collaboration behavior. They must not be copied or synchronized
into each other.

| User-facing name | Existing source | Cardinality | Lifecycle | Intended content |
| --- | --- | --- | --- | --- |
| 主辦／場地備註 | `market.notes` | One per market | Updated with the market record | Organizer rules, entry and parking instructions, venue restrictions, and other information that applies to the whole market |
| 現場交接筆記 | `field_note_created`, `field_note_updated`, `field_note_deleted` | Many per market | Event-sourced and ordered by update time | Changes observed on site, shift handoffs, temporary arrangements, and follow-up items |

## Permissions

- Authorized market members may read both concepts through the existing market
  and event projections.
- Owners and managers keep their existing ability to edit basic market data,
  including `market.notes`.
- Owners and managers keep their existing `canManageFieldNotes` capability.
- Operators and viewers remain read-only for field notes. This change does not
  broaden any role capability.

## UI hierarchy

1. Create and edit market forms label `market.notes` as `主辦／場地備註` and
   describe it as stable, whole-market information.
2. Market cards use the same name when opening the fixed note.
3. Field Ops shows the fixed note first as a read-only reference. It reads the
   existing `market.notes` value and does not create a second copy.
4. The chronological event list appears below it as `現場交接筆記`, with
   examples focused on temporary conditions and shift handoffs.

## Compatibility and non-goals

- No database migration is required.
- Existing `market.notes` and `field_note_*` data retain their meaning and IDs.
- Internal event names stay unchanged for sync and backup compatibility.
- There is no automatic copy, merge, promotion, or two-way synchronization.
- Changing a fixed note never creates a field-note event, and changing a field
  note never updates the market record.
