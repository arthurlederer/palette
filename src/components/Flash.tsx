"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

const MESSAGES: Record<string, string> = {
  saved: "Élément enregistré.",
  deleted: "Élément supprimé.",
  created: "Enregistré.",
  updated: "Modifications enregistrées.",
};

/** Message de confirmation éphémère, piloté par un paramètre d'URL (?saved=1), puis retiré de l'URL. */
export function Flash() {
  return (
    <Suspense>
      <FlashMessage />
    </Suspense>
  );
}

function FlashMessage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = Object.keys(MESSAGES).find((k) => params.get(k) === "1");
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!key) return;
    setMessage(MESSAGES[key]);
    const next = new URLSearchParams(params);
    next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const t = setTimeout(() => setMessage(undefined), 4000);
    return () => clearTimeout(t);
  }, [key, params, pathname, router]);

  if (!message) return null;
  return (
    <div role="status" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-5 py-4 text-paper shadow-lg">
      <CheckCircle2 className="size-5 text-accent" aria-hidden />
      {message}
    </div>
  );
}
