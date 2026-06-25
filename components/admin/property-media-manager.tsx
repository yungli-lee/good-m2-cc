import type { PropertyMedia } from "@/lib/properties/types";

export function PropertyMediaManager({
  media,
  uploadAction,
  setCoverAction
}: {
  media: PropertyMedia[];
  uploadAction: string | ((formData: FormData) => Promise<void>);
  setCoverAction: string | ((mediaId: string) => Promise<void>);
}) {
  const uploadPath = typeof uploadAction === "string" ? uploadAction : undefined;
  const coverPath = typeof setCoverAction === "string" ? setCoverAction : undefined;

  return (
    <section className="section" style={{ paddingBottom: 0 }}>
      <h2>物件照片</h2>
      <form action={uploadAction} method={uploadPath ? "post" : undefined} encType={uploadPath ? "multipart/form-data" : undefined} className="form-grid" style={{ marginBottom: 18 }}>
        <div className="field">
          <label htmlFor="file">上傳照片</label>
          <input className="input" id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
        </div>
        <div className="field">
          <label htmlFor="alt_text">照片說明</label>
          <input className="input" id="alt_text" name="alt_text" />
        </div>
        <div className="field full">
          <button className="button" type="submit" formAction={uploadPath} formMethod={uploadPath ? "post" : undefined}>上傳照片</button>
        </div>
      </form>
      {media.length === 0 ? <div className="notice">尚未上傳照片。</div> : null}
      <div className="grid">
        {media.map((item) => {
          const coverAction = coverPath || (typeof setCoverAction === "string" ? setCoverAction : setCoverAction.bind(null, item.id));

          return (
            <article className="card" key={item.id}>
              <img className="property-image" src={item.url} alt={item.alt_text || "物件照片"} loading="lazy" />
              <div className="card-body">
                <p>{item.alt_text || "未填寫照片說明"}</p>
                <p className="muted">{item.is_cover ? "目前封面照片" : "一般照片"}</p>
                {!item.is_cover ? (
                  <form action={coverAction} method={coverPath ? "post" : undefined}>
                    {coverPath ? <input type="hidden" name="media_id" value={item.id} /> : null}
                    <button className="button secondary" type="submit" formAction={coverPath} formMethod={coverPath ? "post" : undefined}>設為封面</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
