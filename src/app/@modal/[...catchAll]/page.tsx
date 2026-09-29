// On a soft navigation a parallel slot keeps whatever it last rendered unless
// the new URL matches something in it. Without this, following a link out of
// an open composition modal (to /music, /contact, ...) would carry the modal
// along to the next page.
export default function ModalCatchAll() {
  return null;
}
