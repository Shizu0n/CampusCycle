import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vitrine } from '../src/components/Vitrine';
import { apiGet } from '../src/lib/api';
import type { ListingsPage } from '../src/types';

vi.mock('../src/lib/api', () => ({ apiGet: vi.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const emptyPage: ListingsPage = {
  items: [],
  page: 1,
  pageSize: 12,
  total: 0,
};

const pageWithListing: ListingsPage = {
  ...emptyPage,
  total: 1,
  items: [
    {
      id: 'listing-1',
      title: 'Old result',
      description: 'Visible before applying a category filter.',
      category: 'Livros',
      price: 4500,
      imageUrl: null,
      status: 'available',
      createdAt: '2026-07-22T12:00:00.000Z',
    },
  ],
};

const apiGetMock = vi.mocked(apiGet);
let container: HTMLDivElement;
let root: Root;

async function renderVitrine() {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <Vitrine />
      </MemoryRouter>
    );
  });
}

async function finishInitialRequest() {
  await act(async () => {
    vi.advanceTimersByTime(250);
    await Promise.resolve();
  });
}

function clickButton(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  button.click();
}

beforeEach(() => {
  vi.useFakeTimers();
  apiGetMock.mockReset();
  apiGetMock.mockResolvedValue(emptyPage);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('Vitrine filters', () => {
  it('applies category filters immediately without waiting for the text debounce', async () => {
    await renderVitrine();
    await finishInitialRequest();
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    await act(async () => clickButton('Livros'));

    expect(apiGetMock).toHaveBeenCalledTimes(2);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/listings?category=Livros');
  });

  it('replaces stale cards with loading feedback as soon as a category changes', async () => {
    apiGetMock.mockResolvedValueOnce(pageWithListing).mockReturnValueOnce(new Promise(() => {}));
    await renderVitrine();
    await finishInitialRequest();
    expect(container.textContent).toContain('Old result');

    await act(async () => clickButton('Livros'));

    expect(container.textContent).not.toContain('Old result');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('debounces only the text query', async () => {
    await renderVitrine();
    await finishInitialRequest();
    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error('Search input not found');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!valueSetter) throw new Error('HTML input value setter not found');
      valueSetter.call(input, 'c');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'c' }));
    });

    expect(apiGetMock).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(249));
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(apiGetMock).toHaveBeenCalledTimes(2);
    expect(apiGetMock).toHaveBeenLastCalledWith('/api/listings?q=c');
  });
});
