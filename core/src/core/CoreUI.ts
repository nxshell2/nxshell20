import { BrowserWindow, dialog, OpenDialogOptions, SaveDialogOptions, MessageBoxOptions } from "electron";

export async function showOpenDialog(options?: OpenDialogOptions) {
  const win = BrowserWindow.getFocusedWindow();
  const ret = await dialog.showOpenDialog(win, options);
  return ret;
}

export async function showSaveDialog(options?: SaveDialogOptions) {
  const win = BrowserWindow.getFocusedWindow();
  const ret = await dialog.showSaveDialog(win, options);
  return ret;
}

export function showMessageBox(options: MessageBoxOptions) {
  return dialog.showMessageBox(options);
}
