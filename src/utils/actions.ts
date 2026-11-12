import type { ActionConfig } from '../ha-types';

const HOLD_DELAY_MS = 500;

export type ActionKind = 'tap' | 'hold';

export const hasAction = (action?: ActionConfig): boolean =>
  action !== undefined && action.action !== 'none';

/**
 * Detects taps and long presses on an element and calls `onAction`.
 * Returns a cleanup function.
 */
export function bindActions(
  element: HTMLElement,
  onAction: (kind: ActionKind) => void,
): () => void {
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;

  const cancel = () => {
    clearTimeout(holdTimer);
    holdTimer = undefined;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    held = false;
    holdTimer = setTimeout(() => {
      held = true;
      holdTimer = undefined;
      onAction('hold');
    }, HOLD_DELAY_MS);
  };
  const onPointerUp = () => {
    const pending = holdTimer !== undefined;
    cancel();
    if (pending && !held) {
      onAction('tap');
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // A key held down repeats: trigger the action once.
      if (!event.repeat) onAction('tap');
    }
  };
  const onContextMenu = (event: Event) => {
    // Long press on touch screens would otherwise open the context menu.
    if (held || holdTimer !== undefined) event.preventDefault();
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointerleave', cancel);
  element.addEventListener('pointercancel', cancel);
  element.addEventListener('keydown', onKeyDown);
  element.addEventListener('contextmenu', onContextMenu);
  return () => {
    cancel();
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointerleave', cancel);
    element.removeEventListener('pointercancel', cancel);
    element.removeEventListener('keydown', onKeyDown);
    element.removeEventListener('contextmenu', onContextMenu);
  };
}
