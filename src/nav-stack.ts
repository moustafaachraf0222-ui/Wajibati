import type { View } from './types';

export type NavStackEntry = {
  view: View;
};

export type NavStack = NavStackEntry[];

export const ROOT_ENTRY: NavStackEntry = { view: 'overview' };

export function topEntry(stack: NavStack): NavStackEntry {
  return stack[stack.length - 1] ?? ROOT_ENTRY;
}

export function topView(stack: NavStack): View {
  return topEntry(stack).view;
}

export function canGoBack(stack: NavStack): boolean {
  return stack.length > 1;
}

export function pushEntry(stack: NavStack, entry: NavStackEntry): NavStack {
  if (topView(stack) === entry.view) {
    return stack;
  }
  return [...stack, entry];
}

export function popEntry(stack: NavStack): NavStack {
  if (stack.length <= 1) {
    return stack;
  }
  return stack.slice(0, -1);
}

export function popToRoot(stack: NavStack): NavStack {
  if (stack.length <= 1) {
    return stack;
  }
  return [stack[0]];
}

export function replaceTopEntry(stack: NavStack, entry: NavStackEntry): NavStack {
  if (stack.length === 0) {
    return [entry];
  }
  return [...stack.slice(0, -1), entry];
}

export function resetStack(entry: NavStackEntry): NavStack {
  return [entry];
}
