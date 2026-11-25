export interface AnimateOptions {
  duration?: number;
  easing?: string;
  delay?: number;
}

const presets: Record<string, Keyframe[]> = {
  fadeIn: [{ opacity: 0 }, { opacity: 1 }],
  fadeOut: [{ opacity: 1 }, { opacity: 0 }],
  slideIn: [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
  slideOut: [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(12px)" }],
  scaleIn: [{ opacity: 0, transform: "scale(.95)" }, { opacity: 1, transform: "none" }],
  scaleOut: [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.95)" }],
};

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animate an element with a preset name or keyframes. Resolves when finished,
 * cancelled, or immediately if the element isn't rendered. Rejects only for an unknown preset name.
 */
export function animate(el: Element, keyframes: string | Keyframe[], opts: AnimateOptions = {}): Promise<void> {
  const frames = typeof keyframes === "string" ? presets[keyframes] : keyframes;
  if (!frames) return Promise.reject(new Error(`rx.animate: unknown preset "${keyframes}". Known: ${Object.keys(presets).join(", ")}`));
  const duration = reducedMotion() ? 0 : opts.duration ?? 250;
  const anim = el.animate(frames, { duration, easing: opts.easing ?? "ease", delay: opts.delay ?? 0, fill: "both" });
  const last = frames[frames.length - 1];
  return anim.finished.then(
    () => {
      // Commit the end state as inline style, then drop the fill so CSS stays in control later.
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        for (const [k, v] of Object.entries(last)) {
          if (k === "offset" || k === "easing" || k === "composite") continue;
          (el.style as any)[k] = v === "none" ? "" : v;
        }
      }
      anim.cancel();
    },
    () => undefined
  );
}

/** Show a hidden element with an animation. */
export async function show(el: HTMLElement, preset = "fadeIn", opts?: AnimateOptions) {
  el.hidden = false;
  el.style.removeProperty("display");
  await animate(el, preset, opts);
}

/** Animate an element out, then hide it. */
export async function hide(el: HTMLElement, preset = "fadeOut", opts?: AnimateOptions) {
  await animate(el, preset, opts);
  el.hidden = true;
  el.style.removeProperty("opacity");
  el.style.removeProperty("transform");
}

export const animationPresets = Object.keys(presets);
