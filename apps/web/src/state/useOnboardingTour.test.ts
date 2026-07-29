import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useOnboardingTour } from './useOnboardingTour';

const STORAGE_KEY = 'vis-studio-onboarding-seen';

describe('useOnboardingTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts open on a first visit (no localStorage flag)', () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.isOpen).toBe(true);
  });

  it('starts closed if the localStorage flag is already set', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.isOpen).toBe(false);
  });

  it('dismissTour closes it and persists the flag', () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.dismissTour());

    expect(result.current.isOpen).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('openTour reopens it even after it was previously dismissed', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true'); // simulate a returning visitor
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.openTour());

    expect(result.current.isOpen).toBe(true);
  });

  it('openTour -> dismissTour still keeps the flag set for future visits', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useOnboardingTour());

    act(() => result.current.openTour());
    act(() => result.current.dismissTour());

    expect(result.current.isOpen).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });
});
