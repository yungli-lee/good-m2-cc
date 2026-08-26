type FileTransfer = Pick<DataTransfer, "files" | "items">;

export function buildFileSelection(
  selectedFiles: readonly File[],
  files: FileList,
  createTransfer: () => FileTransfer = () => new DataTransfer()
) {
  const incomingFiles = Array.from(files);
  const transfer = createTransfer();

  selectedFiles.forEach((file) => transfer.items.add(file));
  incomingFiles.forEach((file) => transfer.items.add(file));

  const nextFiles = Array.from(transfer.files);
  return {
    fileList: transfer.files,
    files: nextFiles,
    fileNames: nextFiles.map((file) => file.name),
    hasLargeVideo: nextFiles.some((file) => file.type.startsWith("video/") && file.size > 20 * 1024 * 1024)
  };
}
