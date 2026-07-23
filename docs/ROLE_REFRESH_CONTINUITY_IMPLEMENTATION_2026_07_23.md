# Role Refresh Continuity Implementation

Date: 2026-07-23

## Objective

Returning to the app must not reload or unmount an already authorized page.
Role changes must still fail closed for privileged commands, sensitive reads, and
sync while the latest authorization is being confirmed.

## Runtime model

1. `AuthProvider` accepts repeated same-user `SIGNED_IN` events as session
   confirmation. It does not broadcast them as new logins and does not reload
   peer tabs.
2. `RoleProvider` is the only production owner of `useUserRole()` state.
3. A stable authenticated user id controls identity loads. A new user object for
   the same id does not start another role query.
4. The lifecycle port requests a background role revalidation when the app
   becomes active. This works with web visibility today and the Capacitor
   lifecycle adapter later.
5. Staff relationship Realtime events are the fast path for role and permission
   changes. Polling and foreground revalidation are recovery paths.

## Fail-closed continuity

| Stage | Protected page | Privileged interaction | Sensitive sync | Blocking fallback |
| --- | --- | --- | --- | --- |
| `initial_loading` | Not mounted | Blocked | Stopped | Yes |
| `ready` | Mounted | Confirmed permissions | Confirmed level | No |
| `background_refreshing` | Mounted and inert | Blocked | Stopped | No |
| `background_refresh_failed` | Mounted and inert | Blocked | Stopped | No; retry banner |
| `blocked` | Not mounted | Blocked | Stopped | Yes |

The previous same-user role is presentation state only during a background
check. Effective permissions and sync information level remain fail closed.

## Explicit reload boundaries

Normal focus and app resume do not call `window.location.reload()`. A cold start
can still occur when the operating system terminates the process, the user
reloads manually, or a deployed application update deliberately replaces the
document.

