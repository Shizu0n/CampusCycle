import { useRegisterSW } from 'virtual:pwa-register/react';

// registerType 'prompt': needRefresh dispara quando há SW novo esperando;
// aceitar envia SKIP_WAITING (ver sw.ts) e recarrega.
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="reload-prompt card" role="alert">
      <span>Nova versão disponível.</span>
      <button className="btn" onClick={() => updateServiceWorker(true)}>
        Atualizar
      </button>
    </div>
  );
}
