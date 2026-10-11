import { normalizedSearch } from '../lib/station-presentation.mjs';

// Keep the existing selects as the single source of filter state.
export function setupCustomSelects() {
  const controls = [...document.querySelectorAll('[data-select]')].map((root) => {
    const select = root.querySelector('select');
    const trigger = root.querySelector('.select-trigger');
    const menu = root.querySelector('.select-menu');
    const list = root.querySelector('.select-options');
    const search = root.querySelector('.select-search input');
    const label = select.getAttribute('aria-label');
    let typeahead = '';
    let typeaheadTimer;
    const options = () => [...list.querySelectorAll('[role="option"]')];
    const selectedOption = () => list.querySelector('[aria-selected="true"]');

    function sync() {
      const text = select.selectedOptions[0]?.textContent || '';
      trigger.querySelector('.select-value').textContent = text;
      trigger.setAttribute('aria-label', `${label}: ${text}`);
      trigger.disabled = select.disabled;
      if (menu.matches(':popover-open')) renderOptions();
    }
    function renderOptions() {
      const query = normalizedSearch(search?.value || '');
      const matching = [...select.options].filter((option) => !option.disabled && normalizedSearch(option.textContent).includes(query));
      list.replaceChildren(...matching.map((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'select-option';
        button.tabIndex = -1;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.value === select.value));
        const text = document.createElement('span');
        text.textContent = option.textContent;
        const check = document.createElement('span');
        check.className = 'select-check';
        check.textContent = '✓';
        check.setAttribute('aria-hidden', 'true');
        button.append(text, check);
        button.addEventListener('click', () => {
          select.value = option.value;
          menu.hidePopover();
          sync();
          trigger.focus({ preventScroll: true });
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        return button;
      }));
      root.querySelector('.select-empty').hidden = matching.length !== 0;
    }
    function position() {
      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0;
      const top = viewport?.offsetTop || 0;
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      const menuWidth = Math.min(Math.max(rect.width, search ? 320 : 180), width - 32);
      const below = top + height - rect.bottom - 24;
      const above = rect.top - top - 24;
      const openAbove = below < 200 && above > below;
      menu.style.width = `${menuWidth}px`;
      menu.style.maxHeight = `${Math.max(44, Math.min(380, openAbove ? above : below))}px`;
      menu.style.left = `${Math.max(left + 16, Math.min(rect.left, left + width - menuWidth - 16))}px`;
      menu.style.top = openAbove ? 'auto' : `${rect.bottom + 8}px`;
      menu.style.bottom = openAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto';
    }
    function open(focusOption = false) {
      if (search) search.value = '';
      renderOptions();
      menu.showPopover();
      position();
      trigger.setAttribute('aria-expanded', 'true');
      const selected = selectedOption();
      selected?.scrollIntoView({ block: 'nearest' });
      (focusOption ? selected || options()[0] : search || selected || options()[0])?.focus({ preventScroll: true });
    }
    trigger.addEventListener('click', () => menu.matches(':popover-open') ? menu.hidePopover() : open());
    trigger.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        open(true);
        if (event.key === 'Home') options()[0]?.focus();
        if (event.key === 'End') options().at(-1)?.focus();
      }
    });
    search?.addEventListener('input', renderOptions);
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); menu.hidePopover(); trigger.focus(); return;
      }
      if (event.key === 'Tab') { menu.hidePopover(); return; }
      const items = options();
      const index = items.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      } else if (!search || document.activeElement !== search) {
        if (['Home', 'End'].includes(event.key)) {
          event.preventDefault(); (event.key === 'Home' ? items[0] : items.at(-1))?.focus();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
          typeahead += normalizedSearch(event.key);
          clearTimeout(typeaheadTimer);
          typeaheadTimer = setTimeout(() => { typeahead = ''; }, 700);
          items.find((item) => normalizedSearch(item.textContent).startsWith(typeahead))?.focus();
        }
      }
    });
    menu.addEventListener('beforetoggle', (event) => {
      trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
    });
    select.addEventListener('change', sync);
    new MutationObserver(sync).observe(select, { childList: true, attributes: true, attributeFilter: ['disabled'], subtree: true });
    const close = () => { if (menu.matches(':popover-open')) menu.hidePopover(); };
    function reposition() {
      if (!menu.matches(':popover-open')) return;
      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const height = viewport?.height || window.innerHeight;
      if (!rect.width || rect.bottom < top || rect.top > top + height) close();
      else position();
    }
    window.addEventListener('resize', reposition);
    // Track viewport movement when a phone keyboard opens without dismissing search.
    document.addEventListener('scroll', (event) => { if (!menu.contains(event.target)) reposition(); }, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    select.closest('dialog')?.addEventListener('close', close);
    sync();
    return sync;
  });
  return () => controls.forEach((sync) => sync());
}
