import { registerKind, reportError, scopeOf } from "./runtime";
import type { Store } from "./store";

export type ValidationResult = true | void | undefined | string | Record<string, string>;
export type Validator = (values: Record<string, unknown>, form: HTMLFormElement) => ValidationResult | Promise<ValidationResult>;

const validators = new Map<string, Validator>();
export function validator(name: string, fn: Validator) {
  validators.set(name, fn);
}

/** FormData -> plain object. Repeated names become arrays. Files are kept as File objects. */
export function formValues(form: HTMLFormElement, submitter?: HTMLElement | null): Record<string, unknown> {
  const fd = new FormData(form, (submitter as HTMLButtonElement) ?? undefined);
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k in out) {
      const cur = out[k];
      out[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else out[k] = v;
  }
  // Checkbox groups with [] suffix are always arrays.
  for (const k of Object.keys(out)) if (k.endsWith("[]") && !Array.isArray(out[k])) out[k] = [out[k]];
  return out;
}

function showErrors(form: HTMLFormElement, errors: Record<string, string>, store: Store) {
  for (const [field, msg] of Object.entries(errors)) {
    const slot = form.querySelector(`[data-error-for="${CSS.escape(field)}"]`);
    if (slot) slot.textContent = msg;
    const ctrl = form.elements.namedItem(field);
    if (ctrl instanceof HTMLElement) ctrl.setAttribute("aria-invalid", "true");
  }
  store.set("errors", errors);
}

function clearErrors(form: HTMLFormElement, store: Store) {
  form.querySelectorAll("[data-error-for]").forEach((s) => (s.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach((s) => s.removeAttribute("aria-invalid"));
  store.patch({ errors: {}, error: null });
}

function resetForm(form: HTMLFormElement) {
  form.reset();
  // reset() fires no input events; let data-model bindings pick up the new values.
  form.querySelectorAll('[data-model]').forEach((c) => {
    const type = (c as HTMLInputElement).type;
    const ev = type === 'checkbox' || type === 'radio' || c instanceof HTMLSelectElement ? 'change' : 'input';
    c.dispatchEvent(new Event(ev, { bubbles: true }));
  });
}

function csrfToken(): string | null {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? null;
}

registerKind({
  attr: "data-form",
  defaults: () => ({ pending: false, error: null, errors: {}, result: null, submitted: false }),
  init(el, store: Store, cleanup) {
    if (!(el instanceof HTMLFormElement)) {
      reportError(new Error("rx: data-form must be on a <form>"));
      return;
    }
    const form = el;
    // We validate ourselves so custom + native messages show together.
    form.noValidate = true;

    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      if (store.get("pending")) return; // no double submits
      clearErrors(form, store);

      if (!form.checkValidity()) {
        const errors: Record<string, string> = {};
        for (const c of Array.from(form.elements) as HTMLInputElement[]) {
          if (c.name && c.willValidate && !c.validity.valid) errors[c.name] = c.validationMessage;
        }
        showErrors(form, errors, store);
        (form.querySelector(":invalid") as HTMLElement | null)?.focus();
        return;
      }

      const values = formValues(form, e.submitter);
      const vName = form.getAttribute("data-validate");
      if (vName) {
        const v = validators.get(vName);
        if (!v) {
          reportError(new Error(`rx: no validator registered as "${vName}"; refusing to submit`));
          return;
        }
        const result = await v(values, form);
        if (typeof result === "string") {
          store.set("error", result);
          return;
        }
        if (result && typeof result === "object" && Object.keys(result).length) {
          showErrors(form, result, store);
          return;
        }
      }

      const method = ((e.submitter as HTMLButtonElement | null)?.getAttribute("formmethod") || form.getAttribute("method") || "get").toUpperCase();
      const actionUrl = new URL((e.submitter as HTMLButtonElement | null)?.getAttribute("formaction") || form.getAttribute("action") || location.href, location.href);
      const headers: Record<string, string> = { Accept: "application/json", "X-RX-Request": "form" };
      const token = csrfToken();
      if (token) headers["X-CSRF-Token"] = token;

      let body: BodyInit | undefined;
      const fd = new FormData(form, (e.submitter as HTMLButtonElement) ?? undefined);
      const hasFiles = Array.from(fd.values()).some((v) => v instanceof File && (v.name || v.size));
      if (method === "GET") {
        actionUrl.search = new URLSearchParams(fd as any).toString();
      } else if (form.hasAttribute("data-json") && !hasFiles) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(values);
      } else if (hasFiles || form.enctype === "multipart/form-data") {
        body = fd;
      } else {
        body = new URLSearchParams(fd as any);
      }

      const submitters = Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type]), input[type="submit"]'));
      store.patch({ pending: true });
      form.setAttribute("aria-busy", "true");
      submitters.forEach((b) => (b.disabled = true));
      try {
        const res = await fetch(actionUrl, { method, headers, body, credentials: "same-origin" });
        const text = await res.text();
        let data: unknown = text || null;
        if ((res.headers.get("content-type") || "").includes("json") && text) {
          try {
            data = JSON.parse(text);
          } catch {
            /* leave as text */
          }
        }
        if (!res.ok) {
          const d = data as any;
          if (d && typeof d === "object" && d.errors && typeof d.errors === "object") showErrors(form, d.errors, store);
          const message = (d && typeof d === "object" && d.error) || `Request failed (${res.status})`;
          store.set("error", String(message));
          form.dispatchEvent(new CustomEvent("rx:error", { detail: { status: res.status, data }, bubbles: true }));
          return;
        }
        store.patch({ result: data, submitted: true });
        const into = form.getAttribute("data-into");
        if (into) scopeOf(form.parentElement).set(into, data);
        if (form.hasAttribute("data-reset")) resetForm(form);
        form.dispatchEvent(new CustomEvent("rx:success", { detail: { status: res.status, data }, bubbles: true }));
        const redirect = (data as any)?.redirect;
        if (typeof redirect === "string") (window as any).rx.navigate(redirect);
      } catch (err) {
        store.set("error", "Network error. Please try again.");
        form.dispatchEvent(new CustomEvent("rx:error", { detail: { error: err }, bubbles: true }));
      } finally {
        store.patch({ pending: false });
        form.removeAttribute("aria-busy");
        submitters.forEach((b) => (b.disabled = false));
      }
    };

    form.addEventListener("submit", onSubmit);
    cleanup(() => form.removeEventListener("submit", onSubmit));
    return {
      reset: () => {
        resetForm(form);
        clearErrors(form, store);
      },
    };
  },
});
