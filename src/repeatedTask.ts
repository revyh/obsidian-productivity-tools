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

  let nextScheduledDate: Date | null = repeatRule.after(repeatRule.options.dtstart, false);
  let attempts = 0;

  while (nextScheduledDate && isInInitialPeriod(repeatRule.options, nextScheduledDate) && attempts < 10) {
    nextScheduledDate = repeatRule.after(nextScheduledDate, false);
    attempts++;
  }

  if (!nextScheduledDate || isInInitialPeriod(repeatRule.options, nextScheduledDate)) {
    new Notice(`Could not determine next scheduled date for repeat rule: ${fm['task.repeat']}`);
    return;
  }

  await app.fileManager.processFrontMatter(file, (fm) => {
    fm['task.status'] = 'Draft';
    fm['task.scheduled'] = globalThis.moment(nextScheduledDate).format('YYYY-MM-DD');
  });
}

/**
 * Determines if a recurrence rule's occurrence falls within its initial period.
 *
 * When an RRule has BYxxx filters (e.g., BYDAY, BYMONTHDAY), the RFC 5545 expansion
 * algorithm includes the period containing dtstart in the recurrence set. This means
 * the first occurrence can be much sooner than the interval suggests.
 *
 * Example: "every 4 weeks on Saturday" with dtstart=today (Tuesday)
 * - Expected: Saturday 4 weeks from now
 * - Actual: This coming Saturday (just 4 days away)
 *
 * This happens because:
 * 1. The rule considers week 0 (the week containing dtstart)
 * 2. Applies the BYDAY=SA filter within that week
 * 3. Returns the first Saturday ≥ dtstart (this week's Saturday)
 * 4. Only subsequent occurrences are 4 weeks apart
 *
 * This function detects such cases by checking if the first occurrence is closer
 * than one full interval from the reference date, indicating it's from the initial
 * period rather than a "true" first recurrence.
 *
 * @param rruleOptions - The RRule options to check
 * @param date - The date to check (usually first occurrence)
 * @returns true if the first occurrence is from the initial period (closer than one interval)
 */
function isInInitialPeriod(rruleOptions: RRule['options'], date: Date): boolean {
  const { freq, interval = 1, dtstart } = rruleOptions;

  const reference = dtstart;
  let expectedMinDate: Date;

  switch (freq) {
    case RRule.DAILY:
      expectedMinDate = globalThis.moment(reference).add(interval, 'days').toDate();
      break;
    case RRule.WEEKLY:
      expectedMinDate = globalThis.moment(reference).add(interval, 'weeks').toDate();
      break;
    case RRule.MONTHLY:
      expectedMinDate = globalThis.moment(reference).add(interval, 'months').toDate();
      break;
    case RRule.YEARLY:
      expectedMinDate = globalThis.moment(reference).add(interval, 'years').toDate();
      break;
    default:
      // Don't check for hourly/minutely or unknown frequencies
      return false;
  }

  return date < expectedMinDate;
}
