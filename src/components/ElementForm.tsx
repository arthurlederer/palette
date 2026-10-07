"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { Camera, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { Field } from "./Field";
import { elementSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/errors";

type Values = {
  clientName: string;
  lengthCm: string;
  heightCm: string;
  depthCm: string;
  project: string;
  location: string;
  notes: string;
};

type FieldName = keyof Values | "photo" | "carpenterId";

const EMPTY: Values = { clientName: "", lengthCm: "", heightCm: "", depthCm: "", project: "", location: "", notes: "" };

/**
 * Formulaire de déclaration / modification d'un élément, en un seul écran.
 * La photo est compressée dans le navigateur avant envoi (≈ 300-800 Ko au lieu de 3-10 Mo),
 * ce qui rend l'envoi rapide même avec la 4G moyenne d'un atelier.
 */
export function ElementForm({
  action,
  initial,
  initialPhotoUrl,
  suggestions,
  carpenters,
  submitLabel,
  cancelHref,
}: {
  action: (fd: FormData) => Promise<ActionResult<{ id: string }>>;
  initial?: Partial<Values>;
  initialPhotoUrl?: string;
  suggestions: { clients: string[]; projects: string[]; locations: string[] };
  carpenters?: { id: string; name: string }[];
  submitLabel: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [carpenterId, setCarpenterId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(initialPhotoUrl);
  const [compressing, setCompressing] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Validation en temps réel d'un champ, avec le même schéma que le serveur.
  function validateField(name: keyof Values, v: Values) {
    const shape = elementSchema.shape[name];
    const res = shape.safeParse(v[name]);
    setErrors((e) => ({ ...e, [name]: res.success ? undefined : res.error.issues[0].message }));
  }

  function update(name: keyof Values, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched[name] || errors[name]) validateField(name, next);
  }

  function blur(name: keyof Values) {
    setTouched((t) => ({ ...t, [name]: true }));
    validateField(name, values);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setErrors((e) => ({ ...e, photo: undefined }));
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.82,
      });
      const named = new File([compressed], "photo.jpg", { type: "image/jpeg" });
      setPhoto(named);
      setPreview(URL.createObjectURL(named));
    } catch {
      // Format que le navigateur ne sait pas lire (ex. HEIC sur desktop) : on envoie l'original, le serveur tranchera.
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = elementSchema.safeParse(values);
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!parsed.success) for (const i of parsed.error.issues) nextErrors[i.path[0] as FieldName] ??= i.message;
    if (!photo && !initialPhotoUrl) nextErrors.photo = "Ajoutez une photo de l'élément";
    if (carpenters && !carpenterId) nextErrors.carpenterId = "Choisissez le menuisier";
    setErrors(nextErrors);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Vérifiez les champs signalés en rouge.");
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    if (photo) fd.set("photo", photo);
    if (carpenters) fd.set("carpenterId", carpenterId);
    startTransition(async () => {
      try {
        const res = await action(fd);
        if (res.ok) {
          router.push(`/elements/${res.data!.id}?saved=1`);
          router.refresh();
        } else {
          setErrors(res.fieldErrors ?? {});
          setFormError(res.error);
        }
      } catch {
        setFormError("Envoi impossible. Vérifiez votre connexion puis réessayez.");
      }
    });
  }

  const busy = pending || compressing;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 landscape:max-lg:grid-cols-2">
      {/* Photo */}
      <div>
        <p className="label">Photo de l&apos;élément</p>
        <div
          className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-paper-soft ${
            errors.photo ? "border-danger" : "border-line"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Aperçu de la photo" className="size-full object-cover" />
          ) : (
            <div className="px-6 text-center text-muted">
              <Camera className="mx-auto mb-2 size-10" strokeWidth={1.5} aria-hidden />
              <p className="text-sm">Prenez l&apos;élément en entier, de face, avec de la lumière.</p>
            </div>
          )}
          {compressing && (
            <div className="absolute inset-0 flex items-center justify-center bg-paper/80 text-sm font-medium">
              <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Optimisation de la photo…
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" onClick={() => cameraRef.current?.click()} disabled={busy}>
            {preview ? <RotateCcw className="size-5" aria-hidden /> : <Camera className="size-5" aria-hidden />}
            {preview ? "Reprendre" : "Photo"}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => galleryRef.current?.click()} disabled={busy}>
            <ImagePlus className="size-5" aria-hidden /> Galerie
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-label="Prendre une photo"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choisir une photo dans la galerie"
          data-testid="photo-input"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
        {errors.photo && <p className="mt-1.5 text-sm text-danger">{errors.photo}</p>}
      </div>

      {/* Informations */}
      <div className="space-y-5">
        {carpenters && (
          <Field label="Menuisier qui stocke l'élément" error={errors.carpenterId}>
            {(p) => (
              <select {...p} name="carpenterId" className="input" value={carpenterId} onChange={(e) => setCarpenterId(e.target.value)}>
                <option value="">Choisir…</option>
                {carpenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field label="Client" error={errors.clientName} hint="Choisissez dans la liste ou saisissez un nouveau client.">
          {(p) => (
            <>
              <input
                {...p}
                name="clientName"
                className="input"
                list="clients-list"
                autoComplete="off"
                value={values.clientName}
                onChange={(e) => update("clientName", e.target.value)}
                onBlur={() => blur("clientName")}
              />
              <datalist id="clients-list">
                {suggestions.clients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <fieldset>
          <legend className="label">Dimensions (cm)</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["lengthCm", "L", "Longueur"],
                ["heightCm", "H", "Hauteur"],
                ["depthCm", "P", "Profondeur"],
              ] as const
            ).map(([name, short, long]) => (
              <div key={name}>
                <label className="relative block">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-muted">{short}</span>
                  <input
                    name={name}
                    aria-label={`${long} en cm`}
                    aria-invalid={Boolean(errors[name])}
                    className="input pl-9 tabular-nums"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={values[name]}
                    onChange={(e) => update(name, e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={() => blur(name)}
                  />
                </label>
              </div>
            ))}
          </div>
          {(errors.lengthCm || errors.heightCm || errors.depthCm) && (
            <p className="mt-1.5 text-sm text-danger">{errors.lengthCm ?? errors.heightCm ?? errors.depthCm}</p>
          )}
        </fieldset>

        <Field label="Projet d'origine" error={errors.project} hint="Salon ou événement pour lequel l'élément a été fabriqué.">
          {(p) => (
            <>
              <input
                {...p}
                name="project"
                className="input"
                list="projects-list"
                autoComplete="off"
                value={values.project}
                onChange={(e) => update("project", e.target.value)}
                onBlur={() => blur("project")}
              />
              <datalist id="projects-list">
                {suggestions.projects.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Localisation dans l'atelier" error={errors.location} hint="Par exemple : Zone A, étagère 3.">
          {(p) => (
            <>
              <input
                {...p}
                name="location"
                className="input"
                list="locations-list"
                autoComplete="off"
                value={values.location}
                onChange={(e) => update("location", e.target.value)}
                onBlur={() => blur("location")}
              />
              <datalist id="locations-list">
                {suggestions.locations.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Notes" optional error={errors.notes} hint="État, particularités, pièces manquantes…">
          {(p) => (
            <textarea
              {...p}
              name="notes"
              rows={3}
              className="input py-3"
              value={values.notes}
              onChange={(e) => update("notes", e.target.value)}
              onBlur={() => blur("notes")}
            />
          )}
        </Field>

        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {cancelHref && (
            <a href={cancelHref} className="btn btn-ghost">
              Annuler
            </a>
          )}
          <button type="submit" className="btn btn-accent flex-1" disabled={busy}>
            {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {pending ? "Enregistrement…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
