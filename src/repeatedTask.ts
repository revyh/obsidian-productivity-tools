import { Notice, type App, type CachedMetadata, type TFile } from 'obsidian';
import { RRule } from 'rrule';

export async function handleRepeatedTask(app: App, file: TFile, cache: CachedMetadata) {
  const { frontmatter: fm } = cache;
  if (!fm || fm.kind !== 'task' || fm['task.status'].toLowerCase() !== 'done' || !fm['task.repeat']) {
    return;
  }

  const repeatOptions = RRule.parseText(fm['task.repeat'] as string);
  if (!repeatOptions) {
    new Notice(`Unsupported repeat value: ${fm['task.repeat']}`);
    return;
  }

  const repeatRule = new RRule(repeatOptions);
  const today = globalThis.moment.utc().toDate();

  const nextScheduledDate = repeatRule.after(today, false);

  if (!nextScheduledDate) {
    new Notice(`Could not determine next scheduled date for repeat rule: ${fm['task.repeat']}`);
    return;
  }

  await app.fileManager.processFrontMatter(file, (fm) => {
    fm['task.status'] = 'Draft';
    fm['task.scheduled'] = globalThis.moment(nextScheduledDate).format('YYYY-MM-DD');
  });
}
