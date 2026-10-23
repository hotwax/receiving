// Run in an authenticated Receiving detail page with a long, open transfer order.
// Uses the real Ionic elements and app CSS; no mocked services or order data.
export async function checkReceivingScroll() {
  const content = Array.from(document.querySelectorAll<HTMLElement>('ion-content[data-testid="transfer-order-detail-page-content"]'))
    .find(element => element.getBoundingClientRect().height > 0) as (HTMLElement & { getScrollElement(): Promise<HTMLElement> }) | undefined;
  if (!content) throw new Error('Open a transfer order detail page first');
  const scanner = content.querySelector<HTMLElement>('.scanner')!;
  const input = content.querySelector<HTMLInputElement>('ion-card ion-input input')!;
  if (!scanner || !input) throw new Error('An open transfer order with quantity inputs is required');
  const scroll = await content.getScrollElement();
  const originalTop = scroll.scrollTop;
  const originalOffset = content.style.getPropertyValue('--keyboard-offset');
  const passed: string[] = [];
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const check = (ok: boolean, label: string) => { if (!ok) throw new Error(label); passed.push(label); };
  try {
    // Exercise Ionic's keyboard padding even on desktop CI or with a hardware keyboard.
    content.style.setProperty('--keyboard-offset', '290px');
    scroll.scrollTop = 0;
    await frame();
    scroll.scrollTop += input.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 240;
    await frame();
    const rect = input.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    check(hit === input || !!input.closest('ion-input')?.contains(hit), 'Quantity stays visible and tappable with keyboard padding');

    content.style.setProperty('--keyboard-offset', '0px');
    scroll.scrollTop = 600;
    await frame();
    check(scroll.scrollTop >= 599, 'The Ionic content can scroll a long transfer order');
    const firstTop = scanner.getBoundingClientRect().top;
    scroll.scrollTop = 800;
    await frame();
    check(scroll.scrollTop >= 799 && Math.abs(scanner.getBoundingClientRect().top - firstTop) < 1,
      'Scanner stays pinned while the product list scrolls');
    check(Math.abs(firstTop - scroll.getBoundingClientRect().top) < 1, 'Scanner sticks below the page header');
    return { passed };
  } finally {
    if (originalOffset) content.style.setProperty('--keyboard-offset', originalOffset);
    else content.style.removeProperty('--keyboard-offset');
    scroll.scrollTop = originalTop;
  }
}
