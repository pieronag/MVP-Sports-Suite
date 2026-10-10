"use client";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/services/firebase";
import { CheckCircle2, AlertCircle, Lock } from "@/components/player/icons";

// Pago con tarjeta dentro de la PWA (Mercado Pago Checkout API · Card Payment Brick).
// El Brick tokeniza la tarjeta en el navegador: sus datos nunca llegan a nuestros servidores.
type PayResult = { ok: boolean; error?: string; challenge?: { url: string; creq: string } | null; paymentRecordId?: string; returnUrl?: string };

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<void> | null = null;
const loadSdk = () => {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK_URL; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { sdkPromise = null; reject(new Error("sdk")); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
};

async function authedGet(path: string) {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error || "No se pudo preparar el pago");
  return d;
}

export default function CardPayment({ tenantId, amount, isDark, onPay, onApproved }: {
  tenantId: string;
  amount: number;
  isDark: boolean;
  onPay: (card: any, saveCard: boolean) => Promise<PayResult>;
  onApproved: (returnUrl?: string) => void;
}) {
  const containerId = useRef(`mp-card-${Math.random().toString(36).slice(2)}`).current;
  const controller = useRef<any>(null);
  const saveRef = useRef(true);
  const [state, setState] = useState<"loading" | "ready" | "paying" | "challenge" | "approved" | "error">("loading");
  const [message, setMessage] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [challenge, setChallenge] = useState<{ url: string; creq: string } | null>(null);
  saveRef.current = saveCard;

  // Tras el desafío 3D Secure: revisar el estado hasta que Mercado Pago responda
  const pollStatus = async (pid: string) => {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const s = await authedGet(`/api/mercadopago/status?pid=${pid}`).catch(() => null);
      if (s?.ok) { setState("approved"); onApproved(s.returnUrl); return; }
      if (s?.error) { setChallenge(null); setState("ready"); setMessage(s.error); return; }
    }
    setChallenge(null); setState("ready"); setMessage("No recibimos la confirmación del banco. Revisa Mis reservas en unos minutos.");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [setup] = await Promise.all([authedGet(`/api/mercadopago/cards?tenantId=${encodeURIComponent(tenantId)}`), loadSdk()]);
        if (!alive) return;
        setHasSaved((setup.cardsIds || []).length > 0);
        const mp = new (window as any).MercadoPago(setup.publicKey, { locale: "es-CL" });
        controller.current = await mp.bricks().create("cardPayment", containerId, {
          initialization: {
            amount,
            payer: {
              ...(setup.email ? { email: setup.email } : {}),
              ...(setup.customerId && setup.cardsIds?.length ? { customerId: setup.customerId, cardsIds: setup.cardsIds } : {}),
            },
          },
          customization: {
            visual: { style: { theme: isDark ? "dark" : "default", customVariables: { baseColor: "#10b981", borderRadiusMedium: "6px", borderRadiusLarge: "6px" } }, texts: { formSubmit: `Pagar $${new Intl.NumberFormat("es-CL").format(amount)}` } },
            paymentMethods: { maxInstallments: 1 },
          },
          callbacks: {
            onReady: () => alive && setState("ready"),
            onError: (e: any) => { console.warn("brick", e); },
            onSubmit: async (formData: any) => {
              setState("paying"); setMessage("");
              try {
                const res = await onPay(formData, saveRef.current);
                if (res.ok) { setState("approved"); onApproved(res.returnUrl); return; }
                if (res.challenge && res.paymentRecordId) { setChallenge(res.challenge); setState("challenge"); pollStatus(res.paymentRecordId); return; }
                setState("ready"); setMessage(res.error || "El pago fue rechazado. Prueba con otra tarjeta.");
              } catch (e: any) {
                setState("ready"); setMessage(e?.message || "No se pudo procesar el pago.");
              }
            },
          },
        });
      } catch (e: any) {
        if (alive) { setState("error"); setMessage(e?.message || "No se pudo cargar el pago con tarjeta."); }
      }
    })();
    return () => { alive = false; try { controller.current?.unmount(); } catch { /* ya desmontado */ } };
  }, [tenantId, amount, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // Envía el desafío 3D Secure al banco dentro de un iframe
  useEffect(() => {
    if (!challenge) return;
    const form = document.createElement("form");
    form.method = "POST"; form.action = challenge.url; form.target = `${containerId}-3ds`;
    const input = document.createElement("input");
    input.type = "hidden"; input.name = "creq"; input.value = challenge.creq;
    form.appendChild(input); document.body.appendChild(form); form.submit(); form.remove();
  }, [challenge, containerId]);

  const muted = isDark ? "text-slate-400" : "text-slate-500";

  if (state === "approved") {
    return <p className="flex items-center gap-2 p-4 rounded-md bg-emerald-500/10 text-emerald-500 text-[13px] font-semibold"><CheckCircle2 size={18} /> Pago aprobado</p>;
  }

  return (
    <div className="space-y-3">
      {state === "loading" && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}
      {state === "error" && <p role="alert" className="flex items-start gap-2 p-3 rounded-md bg-rose-500/10 text-rose-500 text-[12px] font-semibold"><AlertCircle size={16} /> {message}</p>}
      {state === "challenge" && challenge && (
        <div>
          <p className={`text-[12px] mb-2 ${muted}`}>Tu banco pide confirmar el pago:</p>
          <iframe title="Validación del banco" name={`${containerId}-3ds`} className="w-full h-[420px] rounded-md bg-white" />
        </div>
      )}
      <div id={containerId} className={state === "challenge" ? "hidden" : ""} />
      {state !== "challenge" && state !== "error" && !hasSaved && (
        <label className={`flex items-center gap-2 text-[12px] ${muted}`}>
          <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
          Guardar esta tarjeta para pagar con un toque la próxima vez
        </label>
      )}
      {message && state === "ready" && <p role="alert" className="flex items-start gap-2 p-3 rounded-md bg-rose-500/10 text-rose-500 text-[12px] font-semibold"><AlertCircle size={16} /> {message}</p>}
      {state === "paying" && <p className={`text-[12px] ${muted}`}>Procesando el pago…</p>}
      <p className={`flex items-center gap-1.5 text-[11px] ${muted}`}><Lock size={12} /> Pago seguro con Mercado Pago. Tus datos de tarjeta no pasan por MVP Sports.</p>
    </div>
  );
}
