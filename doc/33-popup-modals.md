# 33 — Popup Modals instead of Browser Alerts

BexSign never shows a browser dialog. `alert()`, `confirm()` and `prompt()` cannot be styled, carry
a `localhost:3003 says` header, look different on every device, block the whole tab and are
suppressed outright by some mobile browsers. Every message, question and single-value prompt goes
through one of two hosts mounted once in `client/src/App.jsx`.

| | |
|---|---|
| Messages (one OK button) | `client/src/components/GlobalAlertModal.jsx` → `showPopupAlert()` |
| Questions and prompts | `client/src/components/GlobalConfirmModal.jsx` → `showConfirmModal()`, `confirmDelete()`, `showPromptModal()` |
| Inline dialogs inside a page | `ConfirmDialog` and `Modal` from `client/src/components/ui/kit.jsx` |

---

## 1. A message

```jsx
import { showPopupAlert } from '../components/GlobalAlertModal';

showPopupAlert('Document sent successfully for signatures.', { title: 'Document sent', type: 'success' });
showPopupAlert(err.message, { title: 'Send failed', type: 'error' });
```

`type` is `info` (the default), `success`, `warning` or `error` and picks the icon and colour.
`title` names the box; `confirmText` renames the button; `onConfirm` runs when it is dismissed.

Messages queue: two in a row are both shown, in order, instead of the second replacing the first.
Escape and the OK button dismiss the one on top.

`window.alert` is still intercepted and routed here, so a stray `alert()` anywhere — including in a
library — appears as a BexSign modal rather than a browser box. That is a safety net, not the way
to write new code.

---

## 2. A yes/no question

`showConfirmModal()` returns a promise, so it reads like the `confirm()` it replaces:

```jsx
import { showConfirmModal, confirmDelete } from '../components/GlobalConfirmModal';

const ok = await showConfirmModal('Are you sure you want to move 3 selected documents to trash?', {
  title: 'Move to trash',
  tone: 'danger',                       // 'danger' | 'warning' (default) | 'info'
  confirmText: 'Yes',
  cancelText: 'No',
  details: ['Offer letter.pdf', 'NDA.pdf', 'MSA.pdf'],   // listed under the message
  note: 'You can restore them from Settings > Trash.'    // small print
});
if (!ok) return;
```

`confirmDelete()` is the same thing with delete wording and the red button already set:

```jsx
if (!await confirmDelete('Invoice 2026.pdf')) return;
```

`details` is what makes a bulk action safe: the person sees exactly which items are about to go.
Pass `onConfirm` instead of awaiting when the action is slow — the modal keeps a spinner on the
button until the promise settles:

```jsx
await showConfirmModal('Delete this webhook?', {
  tone: 'danger',
  confirmText: 'Delete',
  onConfirm: () => apiFetch(`/developer/webhooks/${id}`, { method: 'DELETE' })
});
```

Enter confirms, Escape cancels, clicking the backdrop cancels, and the confirm button takes focus
when the modal opens. Questions queue the same way messages do.

**`window.confirm` is not intercepted, and cannot be.** It is synchronous — it has to return `true`
or `false` immediately — while a React modal needs a turn of the event loop. So a question must
call `showConfirmModal()` and `await` it. There are no `window.confirm` calls left in the client;
keep it that way.

---

## 3. Asking for one value

```jsx
import { showPromptModal } from '../components/GlobalConfirmModal';

const url = await showPromptModal('Paste the address of the image to insert.', {
  title: 'Insert image',
  inputLabel: 'Image URL',
  placeholder: 'https://example.com/picture.png',
  confirmText: 'Insert image'
});
if (url) applyFormat('insertImage', url);
```

Resolves with the text typed, or `null` when cancelled. The button stays disabled while the field is
empty unless `required: false` is passed.

---

## 4. Which one to use

| Situation | Use |
|---|---|
| Something succeeded or failed, nothing to decide | `showPopupAlert()` |
| Short, transient confirmation on a page that has a toast | `useToast()` from `ui/kit.jsx` |
| A destructive action: delete, permanently delete, remove a user, discard changes | `showConfirmModal({ tone: 'danger' })` or `confirmDelete()` |
| A question from a page that already renders its own dialogs | `ConfirmDialog` from `ui/kit.jsx` |
| A form, several fields, anything bigger | `Modal` from `ui/kit.jsx` |

Both hosts fall back to the native box if they are somehow not mounted (very early boot), so a flow
never dead-ends waiting for an answer that cannot arrive.

---

## 5. Where deletes ask for confirmation

Every destructive action in the app is behind a modal:

| Where | Action |
|---|---|
| Documents → row menu | Move to trash · Delete permanently *(page modal)* |
| Documents → toolbar, with rows selected | Move selected to trash · Delete selected permanently, listing the names |
| Settings → Trash | Delete forever · Empty the trash |
| Folders | Delete folder |
| Templates | Delete one or several templates |
| Users | Delete user |
| Signatures | Remove a saved signature |
| Contacts | Delete one or several contacts |
| Settings → Permissions | Delete a role · discard unsaved changes when switching role or user |
| Settings → Developer | Revoke an API key · delete a webhook · delete an OAuth app |
| Reports | Delete a scheduled report |
| My Profile | Remove the profile picture |
| Sign yourself | Delete a self-sign document · remove a document from a draft |
| Document editor | Replace the document content with a template · discard a draft |
| Notifications | Delete a notification · clear the ones already read |
| Integrations | Disconnect an integration · disconnect a cloud drive |

When adding a destructive action, add the confirmation in the same change. The check that nothing
slipped through:

```bash
cd client/src && grep -rn "\balert(\|\bconfirm(\|\bprompt(" --include=*.jsx --include=*.js .
```

Only `GlobalAlertModal.jsx` and `GlobalConfirmModal.jsx` may appear — they are the interception and
the fallback. Anything else is a browser dialog that needs converting.
