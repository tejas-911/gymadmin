import { useEffect, useRef } from 'react';

// Popover menus: Esc or a click outside the wrapper closes them. Esc returns focus to the trigger button.
export default function useDismiss(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const wrap = ref.current;
      if (wrap?.contains(document.activeElement)) wrap.querySelector('button')?.focus();
      closeRef.current();
    };
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) closeRef.current(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return ref;
}
