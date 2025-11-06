import { Notice, type App, type CachedMetadata, type TFile } from 'obsidian';

export async function handleRepeatedTask(app: App, file: TFile, cache: CachedMetadata) {
  const { frontmatter: fm } = cache;
  if (!fm || fm.kind !== 'task' || !fm['task.done'] || !fm['task.repeat']) {
    return;
  }

  if (fm['task.repeat'] !== 'every day' && fm['task.repeat'] !== 'every week') {
    new Notice(`Unsupported repeat value: ${fm['task.repeat']}`);
    return;
  }

  const repeat = fm['task.repeat'] as string;
  const scheduledDate = (fm['task.scheduled'] as string) ?? globalThis.moment().format('YYYY-MM-DD');
  const nextScheduledDate = globalThis
    .moment(scheduledDate)
    .add(1, repeat === 'every day' ? 'day' : 'week')
    .format('YYYY-MM-DD');

  await app.fileManager.processFrontMatter(file, (fm) => {
    fm['task.done'] = false;
    fm['task.scheduled'] = nextScheduledDate;
  });
}
