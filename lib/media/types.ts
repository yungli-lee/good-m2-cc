import type {
  mediaAllowedMimeTypes,
  mediaStatuses,
  mediaUsageRoles,
  mediaUsageTypes,
  mediaUsedByTypes
} from "@/lib/media/constants";

export type MediaUsageType = (typeof mediaUsageTypes)[number];
export type MediaUsageRole = (typeof mediaUsageRoles)[number];
export type MediaUsedByType = (typeof mediaUsedByTypes)[number];
export type MediaStatus = (typeof mediaStatuses)[number];
export type MediaMimeType = (typeof mediaAllowedMimeTypes)[number];

export type MediaAsset = {
  id: string;
  bucket: "media";
  storage_path: string;
  original_filename: string | null;
  mime_type: MediaMimeType | string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  usage_type: MediaUsageType;
  status: MediaStatus;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MediaUsage = {
  id: string;
  media_id: string;
  used_by_type: MediaUsedByType | string;
  used_by_id: string;
  usage_role: MediaUsageRole | string;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type BuildMediaStoragePathInput = {
  scope: string;
  usageType: MediaUsageType;
  mediaId: string;
  extension: string;
  date?: Date;
};
