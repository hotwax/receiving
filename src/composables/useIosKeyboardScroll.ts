import { isPlatform } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';

// Safari's keyboard can be taller than Ionic's estimate, or collapse to a hardware
// keyboard toolbar without blurring the input. Keep the real viewport authoritative.
export function useIosKeyboardScroll() {
  const viewport = window.visualViewport;
  if (!isPlatform('ios') || !viewport) return;

  let frame = 0;
  let revision = 0;
  let paddedContent: HTMLIonContentElement | undefined;
  let originalPadding = '';
  const restorePadding = () => {
    if (!paddedContent) return;
    if (originalPadding) paddedContent.style.setProperty('--keyboard-offset', originalPadding);
    else paddedContent.style.removeProperty('--keyboard-offset');
    paddedContent = undefined;
  };
  const revealInput = async (currentRevision: number) => {
    const input = document.activeElement;
    const content = input?.closest('ion-content') as HTMLIonContentElement | null;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || !content || viewport.scale !== 1) {
      restorePadding();
      return;
    }
    if (content !== paddedContent) {
      restorePadding();
      paddedContent = content;
      originalPadding = content.style.getPropertyValue('--keyboard-offset');
    }
    const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
    content.style.setProperty('--keyboard-offset', `${keyboardHeight}px`);
    if (!keyboardHeight) return;
    const scroll = await content.getScrollElement();
    if (currentRevision !== revision || document.activeElement !== input) return;
    const field = input.closest('ion-input, ion-textarea, ion-searchbar') || input;
    const rect = field.getBoundingClientRect();
    const bounds = scroll.getBoundingClientRect();
    const scanner = content.querySelector('.scanner');
    const visibleTop = Math.max(bounds.top, viewport.offsetTop);
    const scannerRect = scanner?.getBoundingClientRect();
    const top = scannerRect && !scanner?.contains(input) && scannerRect.top <= visibleTop
      ? Math.max(visibleTop, scannerRect.bottom) : visibleTop;
    const bottom = Math.min(bounds.bottom, viewport.offsetTop + viewport.height);
    // Prefer the top edge if a very short viewport cannot fit the entire control.
    const delta = rect.top < top || rect.height > bottom - top
      ? rect.top - top : Math.max(0, rect.bottom - bottom);
    scroll.scrollTop += delta > 0 ? Math.ceil(delta) : Math.floor(delta);
  };
  const schedule = () => {
    const currentRevision = ++revision;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { void revealInput(currentRevision); });
  };
  onMounted(() => {
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
  });
  onUnmounted(() => {
    ++revision;
    cancelAnimationFrame(frame);
    document.removeEventListener('focusin', schedule);
    document.removeEventListener('focusout', schedule);
    viewport.removeEventListener('resize', schedule);
    viewport.removeEventListener('scroll', schedule);
    restorePadding();
  });
}
