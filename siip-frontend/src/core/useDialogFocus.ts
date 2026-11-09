import { nextTick, onMounted, onUnmounted, watch, type Ref } from 'vue';

export function useDialogFocus(elemento: Ref<HTMLElement | null>, abierto: Readonly<Ref<boolean>>, cerrar: () => void) {
  let anterior: HTMLElement | null = null;
  let overflowAnterior: string | null = null;

  function controles() {
    return [...(elemento.value?.querySelectorAll<HTMLElement>(
      'a[href], button:enabled, input:enabled, select:enabled, textarea:enabled, [tabindex="0"]',
    ) ?? [])].filter(control => control.getClientRects().length > 0);
  }
  async function entrar() {
    anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await nextTick();
    if (abierto.value) (controles()[0] ?? elemento.value)?.focus();
  }
  function salir() {
    if (overflowAnterior === null) return;
    document.body.style.overflow = overflowAnterior;
    overflowAnterior = null;
    if (anterior?.isConnected) anterior.focus();
    anterior = null;
  }
  function teclado(evento: KeyboardEvent) {
    if (!abierto.value) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrar();
    }
    if (evento.key !== 'Tab') return;
    const lista = controles();
    const primero = lista[0];
    const ultimo = lista.at(-1);
    if (!primero || !ultimo) {
      evento.preventDefault();
      elemento.value?.focus();
    } else if (!elemento.value?.contains(document.activeElement)
      || (evento.shiftKey ? document.activeElement === primero : document.activeElement === ultimo)) {
      evento.preventDefault();
      (evento.shiftKey ? ultimo : primero).focus();
    }
  }
  watch(abierto, async valor => {
    if (valor) await entrar();
    else { await nextTick(); salir(); }
  });
  onMounted(() => {
    window.addEventListener('keydown', teclado);
    if (abierto.value) void entrar();
  });
  onUnmounted(() => {
    window.removeEventListener('keydown', teclado);
    salir();
  });
}
