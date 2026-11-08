import { Button, HStack, Image, Rectangle, SVG, ZStack, Script, Text, VStack, Widget } from "scripting"
import { headerArt } from "./header"
import { SetMonth } from "./app_intents"
import { jstDay, loadSchedule, monthLayout, monthKey, shift, sixHours, validFeed, validMonth, weeks } from "./calendar"

type Race = {id:string, date:string, name:string, grade:string, status:string, approval:string, gradeStatus:string}
const bg = "#19271F", tile = "#223128", muted = "#B1BDB2", gold = "#E6B84A"
const font = (size:number) => ({ name:"system", size })
function RaceLine({race,size,width}:{race:Race,size:number,width?:number}) {
  const rank=race.grade.replace(/^J/,"")
  const label=(race.grade.startsWith("J")?"J・":"")+({GI:"GⅠ",GII:"GⅡ",GIII:"GⅢ"}[rank] ?? rank)
  const color=rank==="GI"?gold:rank==="GII"?"#AFC9E3":"#DDA477"
  const state=race.status==="cancelled"?"中止 ":race.status==="changed"?"変更 ":race.approval==="pending"?"仮 ":""
  const name=state+(race.gradeStatus==="pending"?"申 ":"")+race.name.replace(/ステークス/g,"S").replace(/カップ/g,"C")
  const gradeWidth=race.grade.startsWith("J")?22:14
  return <HStack spacing={1}>
    <Text font={font(size)} fontWeight={rank==="GI"?"bold":"regular"} foregroundStyle={color} lineLimit={1} minimumScaleFactor={0.85} fixedSize={{horizontal:!width,vertical:false}} frame={width?{width:gradeWidth,alignment:"leading"}:undefined}>{label}</Text>
    <Text font={font(size)} foregroundStyle="#FFFFFF" lineLimit={1} frame={width?{width:width-gradeWidth-1,alignment:"leading"}:undefined}>{name}</Text>
  </HStack>
}
function MonthArrow({target,forward}:{target:string,forward:boolean}) {
  return <Button intent={SetMonth({target})} buttonStyle="plain" accessibilityLabel={forward?"翌月":"前月"}>
    <Image systemName={forward?"chevron.right":"chevron.left"} font={font(13)}
      fontWeight="semibold" foregroundStyle="#D5E3D7" frame={{width:30,height:28}}/>
  </Button>
}
function Header({month,width}:{month:string,width:number}) {
  const date=month.slice(0,4)+"年"+Number(month.slice(5))+"月"
  return <ZStack alignment="leading" frame={{width,height:28}}>
    <SVG code={headerArt(month,width)} resizable renderingMode="original"
      frame={{width,height:28}} accessibilityLabel={date+"　うまログ(仮)"}/>
    <HStack spacing={3} frame={{width,height:28,alignment:"leading"}}>
      <Button intent={SetMonth({target:"today"})} buttonStyle="plain" accessibilityLabel={date+"、今月に戻る"}>
        <Rectangle fill="#FFFFFF" opacity={0.001} frame={{width:102,height:28}}/>
      </Button>
      <MonthArrow target={shift(month,-1)} forward={false}/>
      <MonthArrow target={shift(month,1)} forward={true}/>
    </HStack>
  </ZStack>
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
  const footer=note || (!races.length && !small ? "今月の重賞登録なし" : "")
  const layout=monthLayout(width,height,grid.length,!!footer)
  const {cellWidth,cellHeight}=layout
  const maxRaces=Math.max(1,Math.floor((cellHeight-14)/10))
  const next:Race[]=rows.filter((r:Race)=>r.date>=today && !["changed","cancelled","result"].includes(r.status))
  const monthRows=month===current ? [...races.filter(r=>r.date>=today),...races.filter(r=>r.date<today)] : races
  const view=<ZStack alignment="center" frame={{width,height}} widgetBackground={bg}>
    <Rectangle fill={bg} frame={{width,height}}/>
    <VStack alignment="leading" spacing={layout.sectionGap}
      frame={{width:layout.contentWidth,height:layout.contentHeight,alignment:"topLeading"}}>
    {small ? <VStack alignment="leading" spacing={4}>
      <Text foregroundStyle={muted} font={font(11)}>うまログ(仮)</Text>
      <Text foregroundStyle="#FFFFFF" font={font(14)}>{next[0]?.date.slice(5)??"次の重賞は未登録"}</Text>
      {next[0] ? <RaceLine race={next[0]} size={12}/> : null}
      {next.length && next.filter(r=>r.date===next[0].date).length>1 ? <Text foregroundStyle={muted} font={font(9)}>同日ほか{next.filter(r=>r.date===next[0].date).length-1}件</Text>:null}
    </VStack> : <VStack alignment="leading" spacing={3}>
      <Header month={month} width={layout.contentWidth}/>
      {large ? <VStack spacing={1}>
        <HStack spacing={1}>{[..."日月火水木金土"].map((v,i)=><Text key={i} font={font(9)} foregroundStyle={muted} frame={{width:cellWidth,height:layout.weekdays}}>{v}</Text>)}</HStack>
        {grid.map((week,i)=><HStack key={i} spacing={1}>{week.map((d,col)=>{
          const key=month+"-"+String(d).padStart(2,"0"), list=byDate.get(key)??[], isToday=key===today
          return <VStack key={col} alignment="leading" spacing={0}
            frame={{width:cellWidth,height:cellHeight,alignment:"topLeading"}}
            background={isToday?"#304336":tile} border={{style:isToday?gold:tile,width:isToday?0.8:0}}>
            <Text font={font(10)} foregroundStyle="#FFFFFF" fontWeight={isToday?"bold":"regular"}>{d?String(d):" "}{list.length>maxRaces?" +"+(list.length-maxRaces):""}</Text>
            {list.slice(0,maxRaces).map(r=><RaceLine key={r.id} race={r} size={7.5} width={cellWidth-2}/>)}
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
    </VStack>}
    {footer?<Text font={font(9)} lineLimit={1} foregroundStyle={muted}>{footer}</Text>:null}
    </VStack>
  </ZStack>
  const midnight=Date.parse(today+"T00:00:00+09:00")+86400000
  Widget.present(view,{policy:"after",date:new Date(Math.min(midnight,now+(note?3600000:sixHours)))})
}
main()
