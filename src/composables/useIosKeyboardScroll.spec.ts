import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useIosKeyboardScroll } from './useIosKeyboardScroll';

vi.mock('@ionic/vue', () => ({ isPlatform: () => true }));

describe('iOS keyboard viewport scrolling', () => {
  let viewport: EventTarget & { height: number; offsetTop: number; scale: number };
  let wrapper: ReturnType<typeof mount>;
  let content: HTMLElement;
  let scroll: HTMLElement;
  let input: HTMLInputElement;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  const rect = (top: number, height: number) => ({ top, bottom: top + height, height }) as DOMRect;
  const settle = async () => {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(0));
    await flushPromises();
  };
  const resize = async (height: number) => {
    viewport.height = height;
    viewport.dispatchEvent(new Event('resize'));
    await settle();
  };

  beforeEach(() => {
    frames = new Map(); nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('innerHeight', 938);
    viewport = Object.assign(new EventTarget(), { height: 938, offsetTop: 0, scale: 1 });
    vi.stubGlobal('visualViewport', viewport);
    wrapper = mount(defineComponent({
      setup() { useIosKeyboardScroll(); return () => h('ion-content', h('div', h('ion-input', h('input')))); }
    }), { attachTo: document.body });
    content = wrapper.element as HTMLElement;
    scroll = content.querySelector('div')!;
    input = content.querySelector('input')!;
    Object.assign(content, { getScrollElement: async () => scroll });
    scroll.getBoundingClientRect = () => rect(56, 801);
    input.parentElement!.getBoundingClientRect = () => rect(600 - scroll.scrollTop, 56);
    input.focus();
  });
  afterEach(() => {
    wrapper.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals();
  });

  it('reveals the whole field above a 484px keyboard, rather than assuming 290px', async () => {
    await resize(454);
    expect(content.style.getPropertyValue('--keyboard-offset')).toBe('484px');
    expect(scroll.scrollTop).toBe(202);
    expect(input.parentElement!.getBoundingClientRect().bottom).toBe(454);
  });

  it('removes keyboard space when dismissed without blurring the field', async () => {
    await resize(454); await resize(938);
    expect(document.activeElement).toBe(input);
    expect(content.style.getPropertyValue('--keyboard-offset')).toBe('0px');
    expect(scroll.scrollTop).toBe(202);
  });

  it('keeps an input below a pinned scanner when changing focus', async () => {
    const scanner = document.createElement('div'); scanner.className = 'scanner'; content.prepend(scanner);
    scanner.getBoundingClientRect = () => rect(56, 80);
    scroll.scrollTop = 500;
    await resize(454);
    expect(input.parentElement!.getBoundingClientRect().top).toBe(136);
  });

  it('does not treat pinch zoom as a keyboard', async () => {
    viewport.scale = 2;
    await resize(454);
    expect(scroll.scrollTop).toBe(0);
    expect(content.style.getPropertyValue('--keyboard-offset')).toBe('');
  });

  it('restores padding and removes listeners when unmounted', async () => {
    await resize(454); wrapper.unmount();
    expect(content.style.getPropertyValue('--keyboard-offset')).toBe('');
    await resize(300);
    expect(frames.size).toBe(0);
    expect(scroll.scrollTop).toBe(202);
  });
});
