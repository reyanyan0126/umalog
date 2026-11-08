import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { selectMonth } from "./calendar"

export const SetMonth = AppIntentManager.register({
  name: "UmalogSetMonth",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ target }: {target: string}) => {
    selectMonth(target, Date.now(), Storage)
    Widget.reloadAll()
  }
})
