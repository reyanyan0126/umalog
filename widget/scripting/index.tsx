import { Script, Widget } from "scripting"

async function preview() {
  try { await Widget.preview({family:"systemLarge"}) }
  finally { Script.exit() }
}
preview()
