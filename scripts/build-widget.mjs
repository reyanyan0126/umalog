import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {GRADED_MASTER} from '../graded-master.js';
import {gradedEvents, gradeCode} from '../graded-races.js';

const path = new URL('../widget/graded-races.json', import.meta.url);
const races = gradedEvents(GRADED_MASTER).map(r => ({
  id: r.key, date: r.date, name: r.name, grade: gradeCode(r.grade), venue: r.venue,
  status: r.status, approval: r.approval, gradeStatus: r.gradeStatus,
  proposedGrade: r.proposedGrade ? gradeCode(r.proposedGrade) : null,
  updatedAt: r.retrievedAt
}));
const previous = existsSync(path) ? JSON.parse(readFileSync(path)) : {};
const payload = {schemaVersion: 1, generatedAt: previous.generatedAt, timezone: 'Asia/Tokyo', races};
if (JSON.stringify(previous) !== JSON.stringify(payload) || !Number.isFinite(Date.parse(previous.generatedAt))) {
  if (process.argv.includes('--check')) throw new Error('Regenerate with node scripts/build-widget.mjs');
  payload.generatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
}
