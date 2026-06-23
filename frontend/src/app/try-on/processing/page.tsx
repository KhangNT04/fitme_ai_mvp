"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { tryonApi } from "@/services/tryon-api";
import { useTryOnStore } from "@/stores/tryon-store";
import { Disclaimer } from "@/components/layout/Disclaimer";

export default function TryOnProcessingPage() {
  const router = useRouter();
  const { requestId, input } = useTryOnStore();

  useEffect(() => {
    const generate = async () => {
      if (!requestId || !input.heightCm) {
        router.replace("/try-on");
        return;
      }

      try {
        await tryonApi.generate(requestId);
        router.replace(`/try-on/result/${requestId}`);
      } catch {
        router.replace("/try-on");
      }
    };

    generate();
  }, [requestId, input, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-stone-400" />
      <h1 className="mt-6 text-xl font-semibold">Đang tạo preview thử mặc...</h1>
      <p className="mt-2 text-stone-500">AI đang xử lý outfit và gợi ý size/form/màu</p>
      <Disclaimer className="mt-8" compact />
    </div>
  );
}
