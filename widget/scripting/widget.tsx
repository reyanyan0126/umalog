import { Button, HStack, Script, Spacer, Text, VStack, Widget } from "scripting"
import { SetMonth } from "./app_intents"
import { jstDay, loadSchedule, monthKey, shift, sixHours, validFeed, validMonth, weeks } from "./calendar"

type Race = {id:string, date:string, name:string, grade:string, status:string, approval:string, gradeStatus:string}
const bg = "#19271F", tile = "#223128", muted = "#B1BDB2", gold = "#E6B84A"
const font = (size:number) => ({ name:"system", size })
function RaceLine({race,size}:{race:Race,size:number}) {
  const rank=race.grade.replace(/^J/,"")
  const label=(race.grade.startsWith("J")?"J・":"")+({GI:"GⅠ",GII:"GⅡ",GIII:"GⅢ"}[rank] ?? rank)
  const color=rank==="GI"?gold:rank==="GII"?"#AFC9E3":"#DDA477"
  const state=race.status==="cancelled"?"中止 ":race.status==="changed"?"変更 ":race.approval==="pending"?"仮 ":""
  const name=state+(race.gradeStatus==="pending"?"申 ":"")+race.name.replace(/ステークス/g,"S").replace(/カップ/g,"C")
  return <HStack spacing={1}>
    <Text font={font(size)} fontWeight={rank==="GI"?"bold":"regular"} foregroundStyle={color} fixedSize={{horizontal:true,vertical:false}}>{label}</Text>
    <Text font={font(size)} foregroundStyle="#FFFFFF" lineLimit={1}>{name}</Text>
  </HStack>
}
function Nav({title,target}:{title:string,target:string}) {
  return <Button title={title} intent={SetMonth({target})} buttonStyle="plain" font={font(15)} foregroundStyle="#FFFFFF" />
}
async function main() {
  const now=Date.now(), today=jstDay(now), current=today.slice(0,7)
  const saved=Storage.get<string>(monthKey)
  const month:string=validMonth(saved)?saved!:current
  let {rows,note}=await loadSchedule(now,Storage,async()=>{
    const r=await fetch("https://reyanyan0126.github.io/umalog/widget/graded-races.json",{timeout:6})
    if(!r.ok) throw Error("HTTP "+r.status)
    return await r.json()
  })
  if (!rows.length && note) {
    try {
      const bundled=JSON.parse(await FileManager.readAsString(Script.directory+"/graded-races.json"))
      if(validFeed(bundled)){rows=bundled.races;note="同梱版"}
    } catch {}
  }
  const races:Race[]=rows.filter((r:Race)=>r.date.startsWith(month))
  const byDate=new Map<string,Race[]>()
  for(const r of races) byDate.set(r.date,[...(byDate.get(r.date)??[]),r])
  const grid:number[][]=weeks(month)
  const small=Widget.family==="systemSmall", large=Widget.family==="systemLarge"
  const width=Widget.displaySize.width, height=Widget.displaySize.height
  const cellWidth=Math.floor((width-22)/7)
  const cellHeight=Math.max(27,Math.floor((height-76)/grid.length))
  const maxRaces=Math.max(1,Math.floor((cellHeight-14)/10))
  const next:Race[]=rows.filter((r:Race)=>r.date>=today && !["changed","cancelled","result"].includes(r.status))
  const monthRows=month===current ? [...races.filter(r=>r.date>=today),...races.filter(r=>r.date<today)] : races
  const heading=month.slice(0,4)+"年"+Number(month.slice(5))+"月"
  const view=<VStack alignment="leading" spacing={3} padding={6} widgetBackground={bg}
    frame={{maxWidth:"infinity",maxHeight:"infinity",alignment:"topLeading"}}>
    {small ? <VStack alignment="leading" spacing={4}>
      <Text foregroundStyle={muted} font={font(11)}>うまログ(仮)</Text>
      <Text foregroundStyle="#FFFFFF" font={font(14)}>{next[0]?.date.slice(5)??"次の重賞は未登録"}</Text>
      {next[0] ? <RaceLine race={next[0]} size={12}/> : null}
      {next.length && next.filter(r=>r.date===next[0].date).length>1 ? <Text foregroundStyle={muted} font={font(9)}>同日ほか{next.filter(r=>r.date===next[0].date).length-1}件</Text>:null}
    </VStack> : <VStack alignment="leading" spacing={3}>
      <HStack spacing={10}><Nav title={heading} target="today"/><Nav title="◀" target={shift(month,-1)}/><Nav title="▶" target={shift(month,1)}/><Spacer/><Text foregroundStyle={muted} font={font(9)}>うまログ(仮)</Text></HStack>
      {large ? <VStack spacing={1}>
        <HStack spacing={1}>{[..."日月火水木金土"].map((v,i)=><Text key={i} font={font(9)} foregroundStyle={muted} frame={{width:cellWidth}}>{v}</Text>)}</HStack>
        {grid.map((week,i)=><HStack key={i} spacing={1}>{week.map((d,col)=>{
          const key=month+"-"+String(d).padStart(2,"0"), list=byDate.get(key)??[], isToday=key===today
          return <VStack key={col} alignment="leading" spacing={0} padding={1}
            frame={{width:cellWidth,height:cellHeight,alignment:"topLeading"}}
            background={isToday?"#304336":tile} border={{style:isToday?gold:tile,width:isToday?0.8:0}}>
            <Text font={font(10)} foregroundStyle="#FFFFFF" fontWeight={isToday?"bold":"regular"}>{d?String(d):" "}{list.length>maxRaces?" +"+(list.length-maxRaces):""}</Text>
            {list.slice(0,maxRaces).map(r=><RaceLine key={r.id} race={r} size={7.5}/>)}
          </VStack>
        })}</HStack>)}
      </VStack> : <HStack alignment="top" spacing={8}>
        <VStack spacing={1}>
          <HStack spacing={0}>{[..."日月火水木金土"].map((v,i)=><Text key={i} font={font(9)} foregroundStyle={muted} frame={{width:15}}>{v}</Text>)}</HStack>
          {grid.map((week,i)=><HStack key={i} spacing={0}>{week.map((d,col)=>{
            const key=month+"-"+String(d).padStart(2,"0")
            return <Text key={col} font={font(9)} foregroundStyle={byDate.has(key)?gold:"#FFFFFF"}
              frame={{width:15}} background={key===today?"#304336":bg}
              border={{style:key===today?gold:bg,width:key===today?0.8:0}}>{d?String(d):" "}</Text>
          })}</HStack>)}
        </VStack>
        <VStack alignment="leading" spacing={2}>
        {monthRows.slice(0,3).map(r=><HStack key={r.id} spacing={4}><Text foregroundStyle={muted} font={font(10)}>{r.date.slice(5)}</Text><RaceLine race={r} size={11}/></HStack>)}
        {monthRows.length>3?<Text font={font(9)} foregroundStyle={muted}>ほか{monthRows.length-3}件</Text>:null}
      </VStack></HStack>}
      {!races.length&&!note?<Text foregroundStyle={muted} font={font(9)}>今月の重賞登録なし</Text>:null}
    </VStack>}
    {note?<Text font={font(9)} foregroundStyle={muted}>{note}</Text>:null}
  </VStack>
  const midnight=Date.parse(today+"T00:00:00+09:00")+86400000
  Widget.present(view,{policy:"after",date:new Date(Math.min(midnight,now+(note?3600000:sixHours)))})
}
main()
