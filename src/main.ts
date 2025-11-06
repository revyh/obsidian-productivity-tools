import { MarkdownView, Plugin, type CachedMetadata, type TFile } from 'obsidian';
import { handleRepeatedTask } from './repeatedTask';

export default class MyPlugin extends Plugin {
  async onload() {
    this.registerEvent(this.app.metadataCache.on('changed', this.handleMetadataChange.bind(this)));
  }

  handleMetadataChange(file: TFile, data: string, cache: CachedMetadata) {
    (async () => {
      handleRepeatedTask(this.app, file, cache);

      // Reopen the file if it's currently open in order to sync file and editor content to reflect frontmatter changes
      const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (mdView?.file?.path === file.path) {
        const leaf = this.app.workspace.getMostRecentLeaf();

        if (!leaf) return;
        await leaf.openFile(file);
      }
    })();
  }
}
