export const monthKey = 'umalog.month.v1'
export const cacheKey = 'umalog.feed.v1'
export const sixHours = 21600000
export const jstDay = time => new Date(time + 32400000).toISOString().slice(0, 10)
export const validMonth = value => typeof value === 'string' && /^(?:19|20|21)\d\d-(?:0[1-9]|1[0-2])$/.test(value)
export function shift(month, step) {
  const [y,m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + step, 1)).toISOString().slice(0,7)
}
export function weeks(month) {
  const [y,m] = month.split('-').map(Number)
  const offset = new Date(Date.UTC(y,m-1,1)).getUTCDay()
  const count = new Date(Date.UTC(y,m,0)).getUTCDate()
  return Array.from({length:Math.ceil((count+offset)/7)}, (_,w)=>
    Array.from({length:7}, (_,d)=>{
      const n = w*7+d-offset+1
      return n>0 && n<=count ? n : 0
    }))
}
export function selectMonth(target, now, store) {
  const current = jstDay(now).slice(0,7)
  if (target === 'today' || target === current) store.remove(monthKey)
  else if (validMonth(target)) store.set(monthKey,target)
}
export function validFeed(feed) {
  if (!feed || feed.schemaVersion!==1 || feed.timezone!=='Asia/Tokyo' || !Array.isArray(feed.races)) return false
  const ids=new Set()
  return feed.races.every(r=>{
    if (!r || typeof r.id!=='string' || !r.id || ids.has(r.id) ||
        typeof r.name!=='string' || !r.name.trim() || !/^J?GI{1,3}$/.test(r.grade) ||
        !['planned','program','entries','result','cancelled','changed'].includes(r.status) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(Date.parse(r.date)) ||
        new Date(r.date).toISOString().slice(0,10)!==r.date) return false
    ids.add(r.id)
    return true
  })
}
export async function loadSchedule(now,store,download) {
  const saved=store.get(cacheKey)
  const cached=saved && Number.isFinite(saved.at) && validFeed(saved.feed)
  if(cached && now>=saved.at && now-saved.at<sixHours) return {rows:saved.feed.races, note:''}
  try {
    const feed=await download()
    if(!validFeed(feed)) throw Error('schedule')
    try {store.set(cacheKey,{at:now,feed})} catch {}
    return {rows:feed.races,note:''}
  } catch {
    return cached ? {rows:saved.feed.races,note:'保存版 '+jstDay(saved.at)}
      : {rows:[],note:'通信後に再実行してください'}
  }
}

// The header, weekday labels, gaps and optional footer consume space before the weeks.
export function monthLayout(width,height,rows,hasFooter) {
  const contentWidth=width-20, contentHeight=height-18
  const header=28, weekdays=13, sectionGap=3, gap=1, footer=hasFooter?14:0
  return {contentWidth,contentHeight,header,weekdays,sectionGap,gap,
    cellWidth:(contentWidth-6*gap)/7,
    cellHeight:(contentHeight-header-sectionGap-weekdays-rows*gap-footer)/rows}
}
