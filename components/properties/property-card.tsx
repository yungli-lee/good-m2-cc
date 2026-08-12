import Link from "next/link";
import { formatPublicPing, formatPrice, isLandProperty } from "@/lib/format";
import type { Property } from "@/lib/properties/types";
import { getCoverMedia } from "@/lib/properties/types";

export function PropertyCard({ property }: { property: Property }) {
  const cover = getCoverMedia(property);
  const highlights = (property.highlights || []).slice(0, 3).join("、");
  const areas = [property.land_area_ping == null ? null : `土地 ${formatPublicPing(property.land_area_ping)}`, property.building_area_ping == null ? null : `建物 ${formatPublicPing(property.building_area_ping)}`].filter(Boolean);

  return (
    <article className="card">
      {cover ? (
        <img className="property-image" src={cover.url} alt={cover.alt_text || property.title} loading="lazy" />
      ) : (
        <div className="property-image" role="img" aria-label={`${property.title} 尚未設定封面照片`} />
      )}
      <div className="card-body">
        <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>{property.title}</h2>
        <div className="price">{formatPrice(property.price)}</div>
        <p className="muted">{property.address_public || "地址洽詢"}</p>
        {areas.length ? <p>{areas.join(" / ")}</p> : null}
        {!isLandProperty(property.property_type) && property.layout ? <p>{property.layout}</p> : null}
        {highlights ? <p className="muted">{highlights}</p> : null}
        <Link className="button" href={`/properties/${property.slug}`}>
          查看詳情
        </Link>
      </div>
    </article>
  );
}
