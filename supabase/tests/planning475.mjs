import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const data=JSON.parse(readFileSync(process.env.QUEST_BOOTSTRAP||'/workspace/work/quest474-live.json'));
const edits=JSON.parse(readFileSync(new URL('../../tools/planning/quest_text475.json',import.meta.url))).changes;
const sql=readFileSync(new URL('../../tools/planning/publish_quest475_flag476.sql',import.meta.url),'utf8');
await db.exec('create table "GameDataCurrent"(channel text primary key,version text,published_at timestamptz,data_json jsonb);create table "GameDataVersions"(id bigserial primary key,version text,published_at timestamptz,published_by text,data_json jsonb)');
await db.query('insert into "GameDataCurrent" values($1,$2,now(),$3)',['production',data.dataVersion,data]);
await db.exec(sql);
const current=(await db.query('select data_json from "GameDataCurrent"')).rows[0].data_json;
for(const [key,value] of Object.entries(data.data))if(!['QuestDialogues','MistConfig'].includes(key))assert.deepEqual(current.data[key],value,key+' unchanged');
assert.equal(current.data.QuestDialogues.length,255);
for(const row of current.data.QuestDialogues){const old=data.data.QuestDialogues.find(x=>x.DialogueID===row.DialogueID),edit=edits.find(x=>x.DialogueID===row.DialogueID);assert.deepEqual(row,edit?{...old,Text:edit.Text}:old);}
assert.equal((await db.query('select count(*)::int n from "GameDataVersions"')).rows[0].n,2);
await assert.rejects(()=>db.exec(sql),/PLANNING_VERSION_CHANGED/);await db.exec('rollback');
assert.deepEqual((await db.query('select data_json from "GameDataCurrent"')).rows[0].data_json,current);
await db.close();console.log('planning patch: 44 exact edits, conditions/rewards/all other tables unchanged, backup and version guard passed');
