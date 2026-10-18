// v1.7.0: User-entered race details; never fetches or verifies a racing provider.
// Provenance is explicitly unverified and cannot produce a betting outcome.
import {check,validDate,VENUES,raceKey} from './core.js';
import {validateCalendar,meetingKey} from './calendar.js';
export function planManualRace(calendar,input,at=new Date().toISOString()){
 const previous=validateCalendar(calendar),date=String(input?.date||'').trim(),venue=input?.venue;
 const number=Number(input?.number),name=String(input?.name||'').trim();
 const surface=input?.surface||null,distance=input?.distance===''||input?.distance===undefined||input?.distance===null?null:Number(input.distance);
 const sourceURL=String(input?.sourceURL||'').trim();
 check(validDate(date)&&date>='2000-01-01'&&date<='2199-12-31','開催日が不正です。');
 check(VENUES.includes(venue)&&Number.isInteger(number)&&number>=1&&number<=12,'競馬場・レース番号が不正です。');
 check(name.length<=100,'レース名は100文字以内にしてください。');
 check(surface===null||['芝','ダート','障害'].includes(surface),'コース種別が不正です。');
 check(distance===null||(Number.isInteger(distance)&&distance>=100&&distance<=10000),'距離を確認してください。');
 check(sourceURL.length>0&&sourceURL.length<=1000,'確認した出典URLを入力してください。');
 let url;try{url=new URL(sourceURL);}catch{throw new Error('出典URLはHTTPSで入力してください。');}
 check(url.protocol==='https:'&&!url.username&&!url.password&&!url.hash,'出典URLは認証情報や#を含まないHTTPSで入力してください。');
 check(typeof at==='string'&&Number.isFinite(Date.parse(at)),'登録時刻が不正です。');
 const key=raceKey({date,venue,number});
 check(!previous.races.some(r=>raceKey(r)===key),'同じ開催日・競馬場・番号のレースが登録済みです。変更は開催JSONで確認してください。');
 const meeting=previous.meetings.find(r=>meetingKey(r)===meetingKey({date,venue}));
 check(!meeting||!['cancelled','changed'].includes(meeting.status),'この開催は中止・変更確認中です。レースは追加できません。');
 const base={date,venue,status:'planned',approval:'unknown',sourceURL:url.href,sourceUpdatedAt:null,retrievedAt:at};
 const next={...previous,meetings:[...previous.meetings],races:[...previous.races]};
 if(!meeting)next.meetings.push({...base,meetingNumber:null,dayNumber:null});
 next.races.push({...base,status:'program',number,name:name||null,condition:null,grade:null,proposedGrade:null,gradeStatus:'unknown',surface,distance,startTime:null});
 return {calendar:validateCalendar(next),preview:{date,venue,number,name:name||'名称未入力',sourceURL:url.href,surface,distance,createdMeeting:!meeting}};
}
