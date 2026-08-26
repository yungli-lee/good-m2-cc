type FileTransfer = Pick<DataTransfer, "files" | "items">;
export type FileSelectionSource = "input" | "drop";

export function buildFileSelection(
  selectedFiles: readonly File[],
  files: FileList,
  source: FileSelectionSource,
  createTransfer: () => FileTransfer = () => new DataTransfer()
) {
  const incomingFiles = Array.from(files);

  if (source === "input" && selectedFiles.length === 0) {
    return selectionResult(files, incomingFiles, false);
  }

  const transfer = createTransfer();

  selectedFiles.forEach((file) => transfer.items.add(file));
  incomingFiles.forEach((file) => transfer.items.add(file));

  return selectionResult(transfer.files, Array.from(transfer.files), true);
}

function selectionResult(fileList: FileList, files: File[], shouldReplaceInputFiles: boolean) {
  return {
    fileList,
    files,
    fileNames: files.map((file) => file.name),
    hasLargeVideo: files.some((file) => file.type.startsWith("video/") && file.size > 20 * 1024 * 1024),
    shouldReplaceInputFiles
  };
}
