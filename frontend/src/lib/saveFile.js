/**
 * Saves a blob as a file. Downloads need the Bearer token, so they can't be plain links: the app
 * fetches the file, then hands the browser a temporary object URL to save it from.
 */
export function saveFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
