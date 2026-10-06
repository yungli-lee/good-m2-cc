import type { ComponentPropsWithoutRef } from "react";
import { resolveMediaDelivery, type MediaDeliveryTier } from "@/lib/media/delivery";

type DeliveredImageProps = Omit<ComponentPropsWithoutRef<"img">, "src" | "srcSet" | "sizes"> & {
  alt: string;
  sourceUrl: string;
  tier: Exclude<MediaDeliveryTier, "original">;
  sizes: string;
};

export function DeliveredImage({ alt, sourceUrl, tier, sizes, ...props }: DeliveredImageProps) {
  const delivery = resolveMediaDelivery({ publicUrl: sourceUrl }, tier);

  return (
    <img
      {...props}
      alt={alt}
      src={delivery.src}
      srcSet={delivery.srcSet || undefined}
      sizes={delivery.srcSet ? sizes : undefined}
    />
  );
}
