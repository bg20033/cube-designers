import { Building2, Camera, Car, Flower2, Music2, Sparkles, Tent, UsersRound, Video } from "lucide-react"
import type { Wedding } from "./model"
import type { WeddingPlan } from "./planning-model"

export type PlanningProps = {
  wedding: Wedding
  onSave: (plan: WeddingPlan, message: string) => Promise<boolean>
  busy: boolean
  error: string
}
export function ServiceIcon({ category, size = 21 }: { category: string; size?: number }) {
  const Icon = category === "tent" ? Tent : category === "venue" ? Building2 : category === "photo" || category === "photo_video" ? Camera : category === "video" ? Video : category === "music" ? Music2 : category === "decor" ? Flower2 : category === "beauty" ? Sparkles : category === "transport" ? Car : UsersRound
  return <Icon size={size} strokeWidth={1.6} />
}
